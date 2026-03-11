/**
 * EggCrackVisual 组件导出
 * 蛋壳裂纹可视化组件
 */

export { EggCrackVisual } from './EggCrackVisual';
export type {
  CrackPoint,
  CrackBranch,
  CrackPattern,
  EggCrackVisualProps,
} from './EggCrackVisual';

// 重新导出类型，方便外部使用
export type { HatchInteractionType, HatchInteraction, HatchMemory } from '../../hooks/useEggHatching';
