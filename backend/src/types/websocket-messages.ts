/**
 * Cross-Chain Message Format Definitions
 * 
 * TypeScript interfaces for WebSocket messages between backend and frontend
 * for cross-chain frog travel events
 */

// ========== Client -> Server Events ==========

export interface SubscribeFrogMessage {
  event: 'subscribe:frog';
  data: {
    tokenId: number;
  };
}

export interface UnsubscribeFrogMessage {
  event: 'unsubscribe:frog';
  data: {
    tokenId: number;
  };
}

// ========== Server -> Client Events ==========

/**
 * 跨链旅行开始
 */
export interface CrossChainStartedMessage {
  event: 'crosschain:started';
  data: {
    tokenId: number;
    travelId: number;
    targetChainId: number;
    messageId: string;
    duration: number;
    timestamp: number;
  };
}

/**
 * 青蛙抵达目标链
 */
export interface CrossChainArrivedMessage {
  event: 'crosschain:arrived';
  data: {
    tokenId: number;
    chain: string;
    blockNumber: number;
    gasPrice: string;
    timestamp: number;
  };
}

/**
 * 探索发现事件
 */
export interface CrossChainDiscoveryMessage {
  event: 'crosschain:event';
  data: {
    tokenId: number;
    eventType: 'discovery';
    discoveryType: 'treasure' | 'landmark' | 'encounter' | 'wisdom' | 'rare';
    title: string;
    description: string;
    location: string;
    rarity?: number;
    metadata?: {
      contractAddress?: string;
      contractName?: string;
      tokenName?: string;
      tvl?: string;
      functionName?: string;
      encounterFrogName?: string;
      [key: string]: any;
    };
    timestamp: number;
  };
}

/**
 * 跨链状态更新
 */
export interface CrossChainStatusMessage {
  event: 'crosschain:status';
  data: {
    tokenId: number;
    stage: 'locking' | 'crossing' | 'exploring' | 'returning' | 'unlocking';
    message: string;
    progress?: number;
    timestamp: number;
  };
}

/**
 * 跨链旅行完成
 */
export interface CrossChainCompletedMessage {
  event: 'crosschain:completed';
  data: {
    tokenId: number;
    returnMessageId: string;
    totalDiscoveries: number;
    totalXp: number;
    journal?: {
      title: string;
      content: string;
    };
    timestamp: number;
  };
}

// ========== Combined Type for useWebSocket Hook ==========

export type CrossChainWebSocketMessage =
  | CrossChainStartedMessage
  | CrossChainArrivedMessage
  | CrossChainDiscoveryMessage
  | CrossChainStatusMessage
  | CrossChainCompletedMessage;

// ========== Helper Types ==========

export type DiscoveryType = 'treasure' | 'landmark' | 'encounter' | 'wisdom' | 'rare';

export type CrossChainStage = 'locking' | 'crossing' | 'exploring' | 'returning' | 'unlocking';

export interface Discovery {
  id: string;
  type: DiscoveryType;
  timestamp: Date;
  title: string;
  description: string;
  location: string;
  rarity?: number;
  metadata?: Record<string, any>;
}

// ========== Event Payload Examples ==========

/**
 * Example: Treasure Discovery
 * 
 * {
 *   event: 'crosschain:event',
 *   data: {
 *     tokenId: 123,
 *     eventType: 'discovery',
 *     discoveryType: 'treasure',
 *     title: '发现 PancakeSwap LP Token',
 *     description: '青蛙小呱在流动性池中发现了闪闪发光的 LP Token！',
 *     location: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
 *     rarity: 3,
 *     metadata: {
 *       contractAddress: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
 *       tokenName: 'BNB-USDT LP',
 *       tvl: '$5.2M'
 *     },
 *     timestamp: 1735620000000
 *   }
 * }
 */

/**
 * Example: Landmark Discovery
 * 
 * {
 *   event: 'crosschain:event',
 *   data: {
 *     tokenId: 123,
 *     eventType: 'discovery',
 *     discoveryType: 'landmark',
 *     title: '路过 Venus Protocol',
 *     description: '青蛙小呱路过了知名借贷协议，对这里的流动性池很好奇...',
 *     location: '0xfD36E2c2a6789Db23113685031d7F16329158384',
 *     rarity: 2,
 *     metadata: {
 *       contractName: 'Venus Protocol',
 *       tvl: '$50M',
 *       type: 'Lending Protocol'
 *     },
 *     timestamp: 1735620300000
 *   }
 * }
 */
