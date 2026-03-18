/**
 * ZetaFrog 安静模式配置
 * 管理青蛙在不同时间段的行为模式
 * 
 * 功能:
 * - 工作时间模式: 9:00-18:00 减少打扰
 * - 夜间模式: 22:00-08:00 青蛙自动睡眠
 * - 专注模式: 25分钟番茄钟，完全静默
 * - 用户可自定义时间段
 */

// 安静模式类型
export enum QuietModeType {
  NORMAL = 'normal',           // 正常模式
  WORK_HOURS = 'work_hours',   // 工作时间模式
  NIGHT = 'night',             // 夜间模式
  FOCUS = 'focus',             // 专注模式
  CUSTOM = 'custom',           // 自定义模式
}

// 时间段配置
export interface TimeRange {
  start: string;  // "HH:MM" 格式
  end: string;    // "HH:MM" 格式
}

// 行为配置
export interface BehaviorConfig {
  // 动画
  showAnimations: boolean;        // 是否显示动画
  animationIntensity: 'full' | 'reduced' | 'minimal';  // 动画强度
  
  // 声音
  playSounds: boolean;            // 是否播放声音
  soundVolume: number;            // 音量 0-1
  
  // 通知
  showNotifications: boolean;     // 是否显示通知
  notificationPriority: 'all' | 'important' | 'critical';  // 通知级别
  
  // 交互
  allowInteraction: boolean;      // 是否允许交互
  interactionLevel: 'full' | 'limited' | 'none';  // 交互级别
  
  // 青蛙状态
  frogState: 'normal' | 'sleeping' | 'low_activity' | 'hidden';
}

// 安静模式配置
export interface QuietModeConfig {
  type: QuietModeType;
  enabled: boolean;
  timeRange?: TimeRange;          // 对于 WORK_HOURS, NIGHT, CUSTOM
  duration?: number;              // 对于 FOCUS 模式 (分钟)
  behavior: BehaviorConfig;
  description?: string;             // 描述
}

// 默认行为配置
const DEFAULT_NORMAL_BEHAVIOR: BehaviorConfig = {
  showAnimations: true,
  animationIntensity: 'full',
  playSounds: true,
  soundVolume: 1.0,
  showNotifications: true,
  notificationPriority: 'all',
  allowInteraction: true,
  interactionLevel: 'full',
  frogState: 'normal',
};

const DEFAULT_WORK_HOURS_BEHAVIOR: BehaviorConfig = {
  showAnimations: true,
  animationIntensity: 'reduced',
  playSounds: false,
  soundVolume: 0,
  showNotifications: true,
  notificationPriority: 'important',
  allowInteraction: true,
  interactionLevel: 'limited',
  frogState: 'low_activity',
};

const DEFAULT_NIGHT_BEHAVIOR: BehaviorConfig = {
  showAnimations: false,
  animationIntensity: 'minimal',
  playSounds: false,
  soundVolume: 0,
  showNotifications: false,
  notificationPriority: 'critical',
  allowInteraction: false,
  interactionLevel: 'none',
  frogState: 'sleeping',
};

const DEFAULT_FOCUS_BEHAVIOR: BehaviorConfig = {
  showAnimations: false,
  animationIntensity: 'minimal',
  playSounds: false,
  soundVolume: 0,
  showNotifications: false,
  notificationPriority: 'critical',
  allowInteraction: false,
  interactionLevel: 'none',
  frogState: 'hidden',
};

// 预定义的安静模式
export const PREDEFINED_QUIET_MODES: Record<QuietModeType, QuietModeConfig> = {
  [QuietModeType.NORMAL]: {
    type: QuietModeType.NORMAL,
    enabled: false,
    behavior: DEFAULT_NORMAL_BEHAVIOR,
    description: '正常模式 - 青蛙完全活跃',
  },
  
  [QuietModeType.WORK_HOURS]: {
    type: QuietModeType.WORK_HOURS,
    enabled: true,
    timeRange: { start: '09:00', end: '18:00' },
    behavior: DEFAULT_WORK_HOURS_BEHAVIOR,
    description: '工作时间模式 - 减少打扰，仅重要通知',
  },
  
  [QuietModeType.NIGHT]: {
    type: QuietModeType.NIGHT,
    enabled: true,
    timeRange: { start: '22:00', end: '08:00' },
    behavior: DEFAULT_NIGHT_BEHAVIOR,
    description: '夜间模式 - 青蛙睡眠，仅紧急通知',
  },
  
  [QuietModeType.FOCUS]: {
    type: QuietModeType.FOCUS,
    enabled: false,
    duration: 25, // 默认25分钟番茄钟
    behavior: DEFAULT_FOCUS_BEHAVIOR,
    description: '专注模式 - 完全静默，25分钟番茄钟',
  },
  
  [QuietModeType.CUSTOM]: {
    type: QuietModeType.CUSTOM,
    enabled: false,
    behavior: DEFAULT_NORMAL_BEHAVIOR,
    description: '自定义模式 - 用户自定义配置',
  },
};

// 安静模式管理器类
export class QuietModeManager {
  private currentMode: QuietModeConfig = PREDEFINED_QUIET_MODES[QuietModeType.NORMAL];
  private focusTimer: NodeJS.Timeout | null = null;
  private listeners: Set<(mode: QuietModeConfig) => void> = new Set();
  
  constructor() {
    this.startTimeChecker();
  }
  
  // 获取当前模式
  getCurrentMode(): QuietModeConfig {
    return this.currentMode;
  }
  
  // 设置模式
  setMode(modeType: QuietModeType, customConfig?: Partial<QuietModeConfig>): void {
    const baseMode = PREDEFINED_QUIET_MODES[modeType];
    this.currentMode = {
      ...baseMode,
      ...customConfig,
      behavior: {
        ...baseMode.behavior,
        ...customConfig?.behavior,
      },
    };
    
    this.notifyListeners();
    
    // 如果是专注模式，启动计时器
    if (modeType === QuietModeType.FOCUS && this.currentMode.duration) {
      this.startFocusTimer(this.currentMode.duration);
    }
  }
  
  // 启动专注计时器
  private startFocusTimer(minutes: number): void {
    // 清除现有计时器
    if (this.focusTimer) {
      clearTimeout(this.focusTimer);
    }
    
    // 设置新计时器
    this.focusTimer = setTimeout(() => {
      this.endFocusMode();
    }, minutes * 60 * 1000);
  }
  
  // 结束专注模式
  private endFocusMode(): void {
    this.setMode(QuietModeType.NORMAL);
    
    // 发送通知
    this.sendNotification({
      title: '专注时间结束',
      body: '青蛙说：恭喜你完成了专注时段！休息一下吧~',
      icon: '🎉',
    });
    
    // 清除计时器
    if (this.focusTimer) {
      clearTimeout(this.focusTimer);
      this.focusTimer = null;
    }
  }
  
  // 时间检查器 (用于 WORK_HOURS 和 NIGHT 模式)
  private startTimeChecker(): void {
    // 每分钟检查一次
    setInterval(() => {
      this.checkTimeBasedModes();
    }, 60 * 1000);
    
    // 立即检查一次
    this.checkTimeBasedModes();
  }
  
  // 检查基于时间的模式
  private checkTimeBasedModes(): void {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
    
    // 检查夜间模式
    const nightMode = PREDEFINED_QUIET_MODES[QuietModeType.NIGHT];
    if (nightMode.timeRange) {
      const { start, end } = nightMode.timeRange;
      
      // 处理跨天的时间范围 (例如 22:00 - 08:00)
      let isNightTime = false;
      if (start > end) {
        // 跨天 (例如 22:00 - 08:00)
        isNightTime = currentTime >= start || currentTime <= end;
      } else {
        // 不跨天 (例如 09:00 - 18:00)
        isNightTime = currentTime >= start && currentTime <= end;
      }
      
      // 如果当前是夜间时间且夜间模式启用，自动切换到夜间模式
      if (isNightTime && nightMode.enabled && this.currentMode.type !== QuietModeType.NIGHT && this.currentMode.type !== QuietModeType.FOCUS) {
        this.setMode(QuietModeType.NIGHT);
      }
      
      // 如果当前不是夜间时间但处于夜间模式，切换回正常模式
      if (!isNightTime && this.currentMode.type === QuietModeType.NIGHT) {
        this.setMode(QuietModeType.NORMAL);
      }
    }
    
    // 检查工作时间模式 (只在非夜间时间检查)
    const workMode = PREDEFINED_QUIET_MODES[QuietModeType.WORK_HOURS];
    if (workMode.timeRange && this.currentMode.type !== QuietModeType.NIGHT && this.currentMode.type !== QuietModeType.FOCUS) {
      const { start, end } = workMode.timeRange;
      const isWorkTime = currentTime >= start && currentTime <= end;
      
      // 如果在工作时间且启用，切换到工作模式
      if (isWorkTime && workMode.enabled && this.currentMode.type !== QuietModeType.WORK_HOURS) {
        this.setMode(QuietModeType.WORK_HOURS);
      }
      
      // 如果不在工作时间但处于工作模式，切换回正常模式
      if (!isWorkTime && this.currentMode.type === QuietModeType.WORK_HOURS) {
        this.setMode(QuietModeType.NORMAL);
      }
    }
  }
  
  // 添加监听器
  addListener(listener: (mode: QuietModeConfig) => void): () => void {
    this.listeners.add(listener);
    
    // 立即通知当前状态
    listener(this.currentMode);
    
    // 返回取消订阅函数
    return () => {
      this.listeners.delete(listener);
    };
  }
  
  // 通知监听器
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentMode);
      } catch (error) {
        console.error('Error in quiet mode listener:', error);
      }
    });
  }
  
  // 发送通知
  private sendNotification(notification: { title: string; body: string; icon?: string }): void {
    // 这里可以集成桌面通知 API
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.body,
        icon: notification.icon,
      });
    }
    
    // 同时输出到控制台
    console.log(`[通知] ${notification.title}: ${notification.body}`);
  }
}

// 导出单例实例
export const quietModeManager = new QuietModeManager();

// 默认导出
export default quietModeManager;
