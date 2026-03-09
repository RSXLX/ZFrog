/**
 * Quiet Mode Panel Component
 * UI for managing quiet mode settings
 */

import React from 'react';
import { useQuietMode } from '../hooks/useQuietMode';
import { QuietModeType } from '../config/quietMode';

export const QuietModePanel: React.FC = () => {
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

  // Format time remaining
  const formatTime = (seconds: number | null) => {
    if (seconds === null) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Get mode display info
  const getModeInfo = () => {
    switch (currentMode.type) {
      case QuietModeType.NORMAL:
        return { label: '正常模式', color: '#4CAF50', icon: '🟢' };
      case QuietModeType.WORK_HOURS:
        return { label: '工作模式', color: '#FF9800', icon: '🟠' };
      case QuietModeType.NIGHT:
        return { label: '夜间模式', color: '#3F51B5', icon: '🌙' };
      case QuietModeType.FOCUS:
        return { label: '专注模式', color: '#9C27B0', icon: '🎯' };
      default:
        return { label: '自定义', color: '#757575', icon: '⚙️' };
    }
  };

  const modeInfo = getModeInfo();

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h2>🐸 青蛙安静模式设置</h2>
      
      {/* Current Mode Display */}
      <div
        style={{
          padding: '15px',
          borderRadius: '8px',
          backgroundColor: modeInfo.color + '20',
          border: `2px solid ${modeInfo.color}`,
          marginBottom: '20px',
        }}
      >
        <div style={{ fontSize: '24px', marginBottom: '5px' }}>
          {modeInfo.icon} {modeInfo.label}
        </div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          {currentMode.description}
        </div>
        
        {/* Focus Mode Timer */}
        {isFocusMode && focusTimeRemaining !== null && (
          <div
            style={{
              marginTop: '10px',
              padding: '10px',
              backgroundColor: '#fff',
              borderRadius: '4px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: modeInfo.color }}>
              {formatTime(focusTimeRemaining)}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>专注倒计时</div>
          </div>
        )}
      </div>

      {/* Mode Selection Buttons */}
      <div style={{ marginBottom: '20px' }}>
        <h3>选择模式</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={enableNormalMode}
            disabled={currentMode.type === QuietModeType.NORMAL}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: currentMode.type === QuietModeType.NORMAL ? '#4CAF50' : '#e0e0e0',
              color: currentMode.type === QuietModeType.NORMAL ? '#fff' : '#333',
              cursor: currentMode.type === QuietModeType.NORMAL ? 'default' : 'pointer',
            }}
          >
            🟢 正常模式
          </button>
          
          <button
            onClick={enableWorkHoursMode}
            disabled={currentMode.type === QuietModeType.WORK_HOURS}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: currentMode.type === QuietModeType.WORK_HOURS ? '#FF9800' : '#e0e0e0',
              color: currentMode.type === QuietModeType.WORK_HOURS ? '#fff' : '#333',
              cursor: currentMode.type === QuietModeType.WORK_HOURS ? 'default' : 'pointer',
            }}
          >
            🟠 工作模式
          </button>
          
          <button
            onClick={enableNightMode}
            disabled={currentMode.type === QuietModeType.NIGHT}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: currentMode.type === QuietModeType.NIGHT ? '#3F51B5' : '#e0e0e0',
              color: currentMode.type === QuietModeType.NIGHT ? '#fff' : '#333',
              cursor: currentMode.type === QuietModeType.NIGHT ? 'default' : 'pointer',
            }}
          >
            🌙 夜间模式
          </button>
        </div>
      </div>

      {/* Focus Mode Section */}
      <div style={{ marginBottom: '20px' }}>
        <h3>专注模式 (番茄钟)</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {!isFocusMode ? (
            <>
              <button
                onClick={() => enableFocusMode(25)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#9C27B0',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                🎯 专注 25 分钟
              </button>
              
              <button
                onClick={() => enableFocusMode(50)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#7B1FA2',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                🎯 专注 50 分钟
              </button>
            </>
          ) : (
            <button
              onClick={cancelFocusMode}
              style={{
                padding: '10px 20px',
                borderRadius: '6px',
                border: '2px solid #f44336',
                backgroundColor: '#fff',
                color: '#f44336',
                cursor: 'pointer',
              }}
            >
              ❌ 取消专注
            </button>
          )}
        </div>
      </div>

      {/* Current Behavior Display */}
      <div
        style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
        }}
      >
        <h4>当前行为配置</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '14px' }}>
          <div>✅ 显示动画: {behavior.showAnimations ? '是' : '否'}</div>
          <div>🔊 播放声音: {behavior.playSounds ? '是' : '否'}</div>
          <div>🔔 显示通知: {behavior.showNotifications ? '是' : '否'}</div>
          <div>👆 允许交互: {behavior.allowInteraction ? '是' : '否'}</div>
          <div>🐸 青蛙状态: {behavior.frogState}</div>
          <div>💼 工作时间: {isWorkHours ? '是' : '否'}</div>
          <div>🌙 夜间时间: {isNightTime ? '是' : '否'}</div>
        </div>
      </div>
    </div>
  );
};

export default QuietModePanel;
