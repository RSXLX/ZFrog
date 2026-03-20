import { prisma } from '../../database';
import { AppError } from '../../middlewares/errorHandler';
import { normalizeWalletAddress } from '../identity/nonce.service';

interface SoulImprintInput {
  frogId: number;
  walletAddress: string;
  introText: string;
  voiceSummary?: string;
  preferredStyle?: string;
  requestId?: string;
}

interface SoulImprintOutput {
  tone: string;
  traits: string[];
  evolutionBias: string;
}

const deriveTraits = (introText: string, preferredStyle?: string): string[] => {
  const text = `${introText} ${preferredStyle || ''}`.toLowerCase();
  const traits: string[] = [];

  if (text.includes('冒险') || text.includes('adventure')) traits.push('curious');
  if (text.includes('海') || text.includes('ocean')) traits.push('free-spirited');
  if (text.includes('朋友') || text.includes('friend')) traits.push('warm');
  if (text.includes('学习') || text.includes('study')) traits.push('thoughtful');
  if (traits.length === 0) traits.push('playful', 'warm');

  return Array.from(new Set(traits)).slice(0, 3);
};

const deriveTone = (preferredStyle?: string): string => {
  const style = (preferredStyle || '').toLowerCase();
  if (style.includes('adventur')) return 'playful';
  if (style.includes('calm')) return 'gentle';
  if (style.includes('scholar')) return 'thoughtful';
  return 'warm';
};

const deriveEvolutionBias = (preferredStyle?: string, introText?: string): string => {
  const text = `${preferredStyle || ''} ${introText || ''}`.toLowerCase();
  if (text.includes('adventur') || text.includes('冒险') || text.includes('旅行')) return 'explorer';
  if (text.includes('scholar') || text.includes('学习') || text.includes('研究')) return 'scholar';
  return 'social';
};

export class SoulImprintService {
  async imprint(input: SoulImprintInput): Promise<SoulImprintOutput> {
    if (!input.introText?.trim()) {
      throw new AppError(400, 'introText is required', 'INVALID_INPUT');
    }
    const walletAddress = normalizeWalletAddress(input.walletAddress);

    return prisma.$transaction(async (tx) => {
      const frog = await tx.frog.findUnique({
        where: { id: input.frogId },
        include: { eggProfile: true },
      });
      if (!frog) {
        throw new AppError(404, 'Frog not found', 'NOT_FOUND');
      }
      if (frog.ownerAddress.toLowerCase() !== walletAddress) {
        throw new AppError(403, 'You are not the owner of this frog', 'FORBIDDEN');
      }
      if (!frog.eggProfile) {
        throw new AppError(409, 'Egg has not been claimed yet', 'EGG_NOT_CLAIMED');
      }

      const tone = deriveTone(input.preferredStyle);
      const traits = deriveTraits(input.introText, input.preferredStyle);
      const evolutionBias = deriveEvolutionBias(input.preferredStyle, input.introText);
      const now = new Date();

      await tx.soulProfile.upsert({
        where: { frogId: frog.id },
        update: {
          imprintText: input.introText.trim(),
          temperament: {
            tone,
            traits,
            evolutionBias,
            voiceSummary: input.voiceSummary || null,
            preferredStyle: input.preferredStyle || null,
          },
          bondedAt: now,
          metadata: {
            source: 'soul_imprint',
          },
        },
        create: {
          frogId: frog.id,
          personality: frog.personality,
          imprintText: input.introText.trim(),
          temperament: {
            tone,
            traits,
            evolutionBias,
            voiceSummary: input.voiceSummary || null,
            preferredStyle: input.preferredStyle || null,
          },
          bondedAt: now,
          metadata: {
            source: 'soul_imprint',
          },
        },
      });

      const shouldUnlockHatch = frog.eggProfile.claimStatus !== 'SOUL_IMPRINTED' && frog.eggProfile.claimStatus !== 'HATCHED';
      await tx.eggProfile.update({
        where: { frogId: frog.id },
        data: {
          claimStatus: frog.eggProfile.claimStatus === 'HATCHED' ? 'HATCHED' : 'SOUL_IMPRINTED',
          hatchReadyAt: shouldUnlockHatch ? now : frog.eggProfile.hatchReadyAt,
        },
      });

      await tx.onchainMilestone.create({
        data: {
          frogId: frog.id,
          milestoneType: 'SOUL_IMPRINTED',
          payload: {
            tone,
            traits,
            evolutionBias,
          },
        },
      });

      await tx.domainEvent.create({
        data: {
          frogId: frog.id,
          aggregateType: 'Soul',
          aggregateId: String(frog.id),
          eventType: 'SoulImprinted',
          payload: {
            frogId: frog.id,
            tokenId: frog.tokenId,
            tone,
            traits,
            evolutionBias,
          },
          requestId: input.requestId,
          source: 'soul-imprint.service',
        },
      });

      if (shouldUnlockHatch) {
        await tx.onchainMilestone.create({
          data: {
            frogId: frog.id,
            milestoneType: 'HATCH_UNLOCKED',
            payload: {
              by: 'SOUL_IMPRINT',
            },
          },
        });

        await tx.domainEvent.create({
          data: {
            frogId: frog.id,
            aggregateType: 'Life',
            aggregateId: String(frog.id),
            eventType: 'HatchUnlocked',
            payload: {
              frogId: frog.id,
              tokenId: frog.tokenId,
            },
            requestId: input.requestId,
            source: 'soul-imprint.service',
          },
        });
      }

      return {
        tone,
        traits,
        evolutionBias,
      };
    });
  }
}

export const soulImprintService = new SoulImprintService();
