import React from 'react';
import './EnvironmentEffect.css';
import { EnvironmentType } from '../hooks/useEnvironment';

interface EnvironmentEffectProps {
  environmentType: EnvironmentType;
  lightLevel?: number; // 0.0 to 1.0, provided by useDayNightCycle
}

export const EnvironmentEffect: React.FC<EnvironmentEffectProps> = ({ 
  environmentType, 
  lightLevel = 1.0 
}) => {
  // Use lightLevel to adjust brightness. We can apply a dark overlay based on 1 - lightLevel.
  const darknessOpacity = 1.0 - lightLevel;

  return (
    <div className={`environment-container env-${environmentType}`}>
      {/* 环境特有粒子效果 */}
      {environmentType === 'pond' && <div className="effect-bubbles" />}
      {environmentType === 'forest' && <div className="effect-leaves" />}
      {environmentType === 'snow' && <div className="effect-snowflakes" />}
      {environmentType === 'desert' && <div className="effect-sand" />}
      
      {/* 昼夜明暗遮罩 */}
      <div 
        className="day-night-overlay" 
        style={{ backgroundColor: `rgba(0, 0, 10, ${darknessOpacity})` }} 
      />
    </div>
  );
};
