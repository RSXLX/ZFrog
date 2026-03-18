import React from 'react';
import { HibernationState } from '../hooks/useHibernation';

interface HibernationStatusProps {
  state: HibernationState;
  onWake?: () => void;
}

const containerStyle: React.CSSProperties = {
  position: 'absolute',
  top: 12,
  right: 12,
  minWidth: 180,
  padding: '10px 12px',
  borderRadius: 12,
  background: 'rgba(18, 22, 32, 0.78)',
  color: '#fff',
  fontSize: 12,
  backdropFilter: 'blur(10px)',
  boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
  zIndex: 30,
};

export const HibernationStatus: React.FC<HibernationStatusProps> = ({ state, onWake }) => {
  if (state.status === 'ACTIVE') return null;

  return (
    <div style={containerStyle}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>
        {state.status === 'SLEEPING' ? '🧊 冬眠中' : '🌤️ 正在苏醒'}
      </div>

      <div style={{ opacity: 0.85, lineHeight: 1.45 }}>
        {state.status === 'SLEEPING' ? (
          <>
            已沉睡约 <b>{state.dormantHours}</b> 小时。<br />
            点击唤醒后会逐步恢复精神与心情。
          </>
        ) : (
          <>
            唤醒进度：<b>{state.wakeProgress}%</b>
          </>
        )}
      </div>

      {state.status === 'WAKING' && (
        <div style={{ marginTop: 8, height: 6, background: 'rgba(255,255,255,0.12)', borderRadius: 999 }}>
          <div
            style={{
              width: `${state.wakeProgress}%`,
              height: '100%',
              borderRadius: 999,
              background: 'linear-gradient(90deg, #86efac, #22c55e)',
              transition: 'width 0.25s ease',
            }}
          />
        </div>
      )}

      {state.status === 'SLEEPING' && onWake && (
        <button
          onClick={onWake}
          style={{
            marginTop: 10,
            border: 0,
            borderRadius: 999,
            padding: '6px 10px',
            background: '#22c55e',
            color: '#09210f',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          唤醒它
        </button>
      )}
    </div>
  );
};
