/**
 * 🐸 旅行服务模块统一导出
 * 
 * 职责划分:
 * - travel-wallet-observer: 钱包活动观察
 * - travel-journal: 日记生成和 IPFS
 * - travel-reward: 奖励计算和纪念品
 * - travel-query: 旅行查询
 * - travel-p0: P0 核心功能
 * - travel-feed: 投喂系统
 * - exploration: 探索服务
 * - rescue: 救援服务
 */

// 新拆分模块
export { walletObserverService, WalletObservation, NotableEvent } from './travel-wallet-observer';
export { travelJournalService, Frog } from './travel-journal.service';
export { travelRewardService, SouvenirRarity } from './travel-reward.service';

// 现有模块
export { travelQueryService } from './travel-query.service';
export { travelP0Service } from './travel-p0.service';
export { travelFeedService } from './travel-feed.service';
export { explorationService } from './exploration.service';
export { rescueService } from './rescue.service';
export { chainMaterialService } from './chain-material.service';
export { snackPreferenceService } from './snack-preference.service';
export { addressAnalysisService } from './address-analysis.service';
export { explorationFootprintService } from './exploration-footprint.service';
export { souvenirGenerator } from './souvenir.generator';
