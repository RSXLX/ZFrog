import {
  notifyCrossChainTravelCompleted,
  notifyTravelCompleted,
  notifyTravelProgress,
  notifyTravelStarted,
  setIO,
} from '../../websocket';

type EmitFn = jest.Mock<void, [string, Record<string, unknown>]>;

describe('Travel WebSocket Contract Integration', () => {
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

  it('travel:started and travel:state expose aligned machine fields', () => {
    notifyTravelStarted(1, {
      travelId: 88,
      targetWallet: '0x0000000000000000000000000000000000000000',
      startTime: new Date('2026-03-21T00:00:00.000Z'),
      endTime: new Date('2026-03-21T01:00:00.000Z'),
      chainId: 7001,
      status: 'PENDING',
    });

    const started = payloadOf('travel:started');
    const state = payloadOf('travel:state');

    expect(started.status).toBe('PENDING');
    expect(started.currentStage).toBe('PREPARING');
    expect(started.progress).toBe(0);

    expect(state.status).toBe('PENDING');
    expect(state.currentStage).toBe('PREPARING');
    expect(state.progress).toBe(0);
  });

  it('travel:progress maps processing phases to machine state', () => {
    notifyTravelProgress(2, {
      phase: 'generating_story',
      message: '正在生成旅行故事',
      percentage: 77,
    });

    const progress = payloadOf('travel:progress');
    const state = payloadOf('travel:state');

    expect(progress.status).toBe('PROCESSING');
    expect(progress.currentStage).toBe('INTERACTING');
    expect(progress.progress).toBe(77);

    expect(state.status).toBe('PROCESSING');
    expect(state.currentStage).toBe('INTERACTING');
    expect(state.progress).toBe(77);
  });

  it('legacy completion channels emit COMPLETED/COMPLETED contract', () => {
    notifyTravelCompleted(3, {
      travelId: 99,
      xpEarned: 42,
      totalDiscoveries: 5,
    });

    notifyCrossChainTravelCompleted(3, {
      returnMessageId: '0xabc',
      totalDiscoveries: 5,
      totalXp: 42,
    });

    const travelCompleted = payloadOf('travel:completed');
    const crosschainCompleted = payloadOf('crosschain:completed');
    const stateEvents = emit.mock.calls.filter(([eventName]) => eventName === 'travel:state').map(([, payload]) => payload);

    expect(travelCompleted.status).toBe('COMPLETED');
    expect(travelCompleted.currentStage).toBe('COMPLETED');
    expect(travelCompleted.progress).toBe(100);

    expect(crosschainCompleted.status).toBe('COMPLETED');
    expect(crosschainCompleted.currentStage).toBe('COMPLETED');
    expect(crosschainCompleted.progress).toBe(100);

    expect(stateEvents.some((payload) => payload.status === 'COMPLETED' && payload.currentStage === 'COMPLETED')).toBe(true);
  });
});
