import {
  notifyCrossChainStatus,
  notifyTravelStageUpdate,
  setIO,
} from '../../websocket';

type EmitFn = jest.Mock<void, [string, Record<string, unknown>]>;

describe('Travel WebSocket State Alignment E2E', () => {
  let emit: EmitFn;

  const payloadOf = (event: string): Record<string, unknown> => {
    const call = emit.mock.calls.find(([eventName]) => eventName === event);
    if (!call) {
      throw new Error(`Expected event ${event} to be emitted`);
    }
    return call[1];
  };

  beforeEach(() => {
    emit = jest.fn<void, [string, Record<string, unknown>]>();
    const fakeIo = {
      to: jest.fn().mockReturnValue({ emit }),
    } as any;
    setIO(fakeIo);
  });

  it('maps legacy travel stage values to travel-state-machine stage/status', () => {
    notifyTravelStageUpdate(7, {
      travelId: 101,
      stage: 'ON_TARGET_CHAIN',
      progress: 30,
      message: '开始探索',
    });

    const stageUpdate = payloadOf('travel:stageUpdate');
    const state = payloadOf('travel:state');

    expect(stageUpdate.stage).toBe('OBSERVING');
    expect(stageUpdate.currentStage).toBe('OBSERVING');
    expect(stageUpdate.status).toBe('ACTIVE');
    expect(stageUpdate.legacyStage).toBe('ON_TARGET_CHAIN');
    expect(stageUpdate.progress).toBe(30);

    expect(state.currentStage).toBe('OBSERVING');
    expect(state.status).toBe('ACTIVE');
    expect(state.legacyStage).toBe('ON_TARGET_CHAIN');
    expect(state.progress).toBe(30);
  });

  it('maps crosschain:status to aligned machine state while keeping legacy stage as metadata', () => {
    notifyCrossChainStatus(8, {
      stage: 'returning',
      message: '返程中',
      progress: 82,
    });

    const crosschainStatus = payloadOf('crosschain:status');
    const state = payloadOf('travel:state');

    expect(crosschainStatus.stage).toBe('RETURNING');
    expect(crosschainStatus.currentStage).toBe('RETURNING');
    expect(crosschainStatus.status).toBe('ACTIVE');
    expect(crosschainStatus.legacyStage).toBe('returning');
    expect(crosschainStatus.progress).toBe(82);

    expect(state.currentStage).toBe('RETURNING');
    expect(state.status).toBe('ACTIVE');
    expect(state.legacyStage).toBe('returning');
    expect(state.progress).toBe(82);
  });
});
