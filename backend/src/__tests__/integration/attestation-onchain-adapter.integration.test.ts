import { relationshipAttestationOnchainAdapter } from '../../modules/web3/attestation-onchain.adapter';
import { prisma } from '../../database';
import { onchainMilestoneService } from '../../modules/web3/onchain-milestone.service';

jest.mock('../../database', () => ({
  prisma: {
    relationshipAttestation: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    onchainMilestone: {
      findFirst: jest.fn(),
    },
    domainEvent: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../../modules/web3/onchain-milestone.service', () => ({
  onchainMilestoneService: {
    record: jest.fn(),
  },
}));

describe('RelationshipAttestationOnchainAdapter Integration', () => {
  const mockPrisma = prisma as unknown as {
    relationshipAttestation: {
      findUnique: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
    };
    onchainMilestone: {
      findFirst: jest.Mock;
    };
    domainEvent: {
      create: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  const mockOnchainMilestoneService = onchainMilestoneService as jest.Mocked<typeof onchainMilestoneService>;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.V2_ATTESTATION_FORCE_FAIL;
    delete process.env.V2_ATTESTATION_CHAIN_ID;
    mockPrisma.$transaction.mockImplementation(async (input: any) => {
      if (typeof input === 'function') {
        return input(mockPrisma);
      }
      return input;
    });
    mockPrisma.relationshipAttestation.update.mockResolvedValue({});
    mockPrisma.domainEvent.create.mockResolvedValue({});
    mockOnchainMilestoneService.record.mockResolvedValue({
      id: '9901',
      frogId: 1,
      travelId: null,
      attestationId: 'att_1',
      type: 'relationship_attested',
      milestoneType: 'RELATIONSHIP_ATTESTED',
      chainId: 7001,
      txHash: '0xabc',
      blockNumber: '123',
      payload: {},
      createdAt: new Date('2026-03-23T00:00:00.000Z').toISOString(),
    });
  });

  it('submits queued attestation and records onchain trace', async () => {
    mockPrisma.relationshipAttestation.findUnique.mockResolvedValue({
      id: 'att_1',
      subjectFrogId: 1,
      objectFrogId: 2,
      attestationType: 'blessing',
      source: 'v2-social',
      status: 'QUEUED',
      evidence: null,
    });

    mockPrisma.onchainMilestone.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 99n,
        attestationId: 'att_1',
        txHash: '0x123',
        chainId: 7001,
        blockNumber: 123n,
        createdAt: new Date('2026-03-23T10:00:00.000Z'),
      });

    const result = await relationshipAttestationOnchainAdapter.submitByAttestationId({
      attestationId: 'att_1',
      requestId: 'req_1',
      source: 'test.adapter',
    });

    expect(result.status).toBe('CONFIRMED');
    expect(result.idempotentReplay).toBe(false);
    expect(result.trace?.attestationId).toBe('att_1');
    expect(result.trace?.txHash).toBe('0x123');

    expect(mockOnchainMilestoneService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        frogId: 1,
        attestationId: 'att_1',
        milestoneType: 'RELATIONSHIP_ATTESTED',
      }),
      expect.objectContaining({
        source: 'test.adapter',
      })
    );

    expect(mockPrisma.relationshipAttestation.update).toHaveBeenCalledWith({
      where: { id: 'att_1' },
      data: { status: 'CONFIRMED' },
    });

    expect(mockPrisma.domainEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          aggregateType: 'Attestation',
          aggregateId: 'att_1',
          eventType: 'RelationshipAttestationOnchainConfirmed',
        }),
      })
    );
  });

  it('reuses existing trace as idempotent replay', async () => {
    mockPrisma.relationshipAttestation.findUnique.mockResolvedValue({
      id: 'att_2',
      subjectFrogId: 3,
      objectFrogId: 4,
      attestationType: 'bond',
      source: 'v2-social',
      status: 'QUEUED',
      evidence: null,
    });

    mockPrisma.onchainMilestone.findFirst.mockResolvedValue({
      id: 109n,
      attestationId: 'att_2',
      txHash: '0xaaa',
      chainId: 7001,
      blockNumber: 456n,
      createdAt: new Date('2026-03-23T12:00:00.000Z'),
    });

    const result = await relationshipAttestationOnchainAdapter.submitByAttestationId({
      attestationId: 'att_2',
      source: 'test.adapter',
    });

    expect(result.status).toBe('CONFIRMED');
    expect(result.idempotentReplay).toBe(true);
    expect(result.trace?.txHash).toBe('0xaaa');
    expect(mockOnchainMilestoneService.record).not.toHaveBeenCalled();
  });
});
