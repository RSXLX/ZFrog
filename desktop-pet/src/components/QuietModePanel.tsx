import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuietMode } from '../hooks/useQuietMode';
import { QuietModeType } from '../config/quietMode';

interface QuietModePanelProps {
  visible: boolean;
  onClose: () => void;
}

export const QuietModePanel: React.FC<QuietModePanelProps> = ({ visible, onClose }) => {
  const {
    currentMode,
    isFocusMode,
    focusTimeRemaining,
    behavior,
    isWorkHours,
    isNightTime,
    enableNormalMode,
    enableWorkHoursMode,
    enableNightMode,
    enableFocusMode,
    cancelFocusMode,
  } = useQuietMode();

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getModeInfo = () => {
    switch (currentMode.type) {
      case QuietModeType.NORMAL:
        return { label: '正常模式', color: '#22c55e', icon: '🟢' };
      case QuietModeType.WORK_HOURS:
        return { label: '工作模式', color: '#f59e0b', icon: '🟠' };
      case QuietModeType.NIGHT:
        return { label: '夜间模式', color: '#3b82f6', icon: '🌙' };
      case QuietModeType.FOCUS:
        return { label: '专注模式', color: '#8b5cf6', icon: '🎯' };
      default:
        return { label: '自定义', color: '#64748b', icon: '⚙️' };
    }
  };

  const modeInfo = getModeInfo();

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 380,
              maxHeight: '84vh',
              overflow: 'auto',
              borderRadius: 18,
              background: 'white',
              padding: 20,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>🐸 安静模式</h2>
              <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            <div
              style={{
                padding: 15,
                borderRadius: 12,
                backgroundColor: `${modeInfo.color}20`,
                border: `2px solid ${modeInfo.color}`,
                marginBottom: 18,
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 6 }}>
                {modeInfo.icon} {modeInfo.label}
              </div>
              <div style={{ fontSize: 13, color: '#475569' }}>{currentMode.description}</div>

              {isFocusMode && focusTimeRemaining !== null ? (
                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    backgroundColor: '#fff',
                    borderRadius: 8,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 28, fontWeight: 700, color: modeInfo.color }}>{formatTime(focusTimeRemaining)}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>专注倒计时</div>
                </div>
              ) : null}
            </div>

            <div style={{ marginBottom: 18 }}>
              <h3 style={{ marginBottom: 10 }}>选择模式</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <button onClick={enableNormalMode} style={{ padding: '10px 12px', borderRadius: 10, border: 'none', background: '#dcfce7', cursor: 'pointer' }}>
                  🟢 正常
                </button>
                <button onClick={enableWorkHoursMode} style={{ padding: '10px 12px', borderRadius: 10, border: 'none', background: '#fef3c7', cursor: 'pointer' }}>
                  🟠 工作
                </button>
                <button onClick={enableNightMode} style={{ padding: '10px 12px', borderRadius: 10, border: 'none', background: '#dbeafe', cursor: 'pointer' }}>
                  🌙 夜间
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <h3 style={{ marginBottom: 10 }}>专注模式</h3>
              <div style={{ display: 'flex', gap: 10 }}>
                {!isFocusMode ? (
                  <>
                    <button onClick={() => enableFocusMode(25)} style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: 'none', background: '#ede9fe', cursor: 'pointer' }}>
                      25 分钟
                    </button>
                    <button onClick={() => enableFocusMode(50)} style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: 'none', background: '#ddd6fe', cursor: 'pointer' }}>
                      50 分钟
                    </button>
                  </>
                ) : (
                  <button onClick={cancelFocusMode} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #fecaca', background: '#fff1f2', cursor: 'pointer' }}>
                    取消专注
                  </button>
                )}
              </div>
            </div>

            <div
              style={{
                padding: 14,
                borderRadius: 12,
                background: '#f8fafc',
                fontSize: 13,
                lineHeight: 1.7,
                color: '#334155',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>当前行为</div>
              <div>显示动画：{behavior.showAnimations ? '是' : '否'}</div>
              <div>播放声音：{behavior.playSounds ? '是' : '否'}</div>
              <div>显示通知：{behavior.showNotifications ? '是' : '否'}</div>
              <div>允许交互：{behavior.allowInteraction ? '是' : '否'}</div>
              <div>青蛙状态：{behavior.frogState}</div>
              <div>工作时间：{isWorkHours ? '是' : '否'}</div>
              <div>夜间时间：{isNightTime ? '是' : '否'}</div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default QuietModePanel;
