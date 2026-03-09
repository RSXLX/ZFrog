/**
 * ZetaFrog Desktop Pet - Main Entry Point
 * All emergency fixes integrated
 */

// Config exports
export { LIFECYCLE_CONFIG, TEST_LIFECYCLE_CONFIG } from './config/lifecycle';
export {
  ZETACHAIN_CONFIG,
  CURRENT_NETWORK,
  MONITORING_CONFIG,
  EVENT_RESPONSES,
  ChainEventType,
} from './config/chain';
export {
  quietModeManager,
  QuietModeType,
  PREDEFINED_QUIET_MODES,
} from './config/quietMode';

// Service exports
export {
  chainMonitor,
  ChainMonitorService,
} from './services/chainMonitor';

// Hook exports
export { useQuietMode } from './hooks/useQuietMode';

// Component exports
export { QuietModePanel } from './components/QuietModePanel';

// Version
export const VERSION = '1.1.0-emergency-fixes';
export const BUILD_DATE = '2026-03-05';

// Emergency fixes changelog
export const EMERGENCY_FIXES = {
  lifecycle: {
    title: '生命周期数值衰减修复',
    description: '大幅放缓衰减速度，减少用户负担',
    improvements: {
      hunger: '1/4h (was 1/h) - 75% slower',
      energy: '1/2h (was 2/h) - 75% slower',
      happiness: '1/3h (was 1/h) - 66% slower',
      health: '1/8h (was 0.5/h) - 75% slower',
    },
  },
  chainMonitor: {
    title: 'ZetaChain 真实数据接入',
    description: '从模拟数据切换到主网实时数据',
    features: [
      'Real-time block monitoring via WebSocket',
      'Large transfer detection (>100 ZETA)',
      'Whale detection (>1000 ZETA)',
      'Gas price alerts (50/100 gwei thresholds)',
      '18 event types supported',
    ],
    network: {
      mainnet: 'https://api.mainnet.zetachain.com',
      testnet: 'https://api.athens.zetachain.com',
    },
  },
  quietMode: {
    title: '智能安静模式系统',
    description: '4种智能模式，自动时间切换',
    modes: {
      normal: {
        name: '正常模式',
        features: 'Full animation, sound, notifications',
        autoSwitch: false,
      },
      workHours: {
        name: '工作模式',
        features: 'Reduced animations, silent, important notifications only',
        autoSwitch: '09:00-18:00 weekdays',
      },
      night: {
        name: '夜间模式',
        features: 'Sleeping frog, no animations/sounds, critical only',
        autoSwitch: '22:00-08:00',
      },
      focus: {
        name: '专注模式',
        features: 'Hidden frog, complete silence, Pomodoro timer',
        autoSwitch: false,
        duration: '25min default, customizable',
      },
    },
  },
};

console.log(`🐸 ZetaFrog v${VERSION} - Emergency Fixes Loaded`);
console.log('✅ Lifecycle decay rates fixed (66-75% slower)');
console.log('✅ ZetaChain mainnet integration active');
console.log('✅ Quiet mode system with 4 smart modes');
