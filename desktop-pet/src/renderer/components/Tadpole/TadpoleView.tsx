/**
 * TadpoleView - 蝌蚪阶段集成视图
 * Phase 2: 整合 Tadpole 组件与宠物系统
 * 
 * 功能：
 * - 展示蝌蚪阶段 UI
 * - 提供水生环境管理控制
 * - 变态发育进度展示
 * - 与主宠物系统同步
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Pet, FoodType } from '../../hooks/usePetEgg';
import { useTadpoleState } from '../../hooks/useTadpoleState';
import { Tadpole, TadpoleStage, WaterEnvironment } from '../Tadpole/Tadpole';
import './TadpoleView.css';

interface TadpoleViewProps {
  pet: Pet | null;
  onFeed: (foodType: FoodType) => void;
  onPlay: () => void;
  onEvolve: () => void;
  onPetUpdate: (updates: Partial<Pet>) => void;
}

export const TadpoleView: React.FC<TadpoleViewProps> = ({
  pet,
  onFeed,
  onPlay,
  onEvolve,
  onPetUpdate,
}) => {
  const tadpoleState = useTadpoleState(pet || undefined);
  const [isInteracting, setIsInteracting] = useState(false);
  const [showEnvironmentControls, setShowEnvironmentControls] = useState(false);
  
  // 同步宠物数据
  useEffect(() => {
    if (pet) {
      tadpoleState.syncFromPet(pet);
    }
  }, [pet, tadpoleState]);
  
  // 定期同步到宠物系统
  useEffect(() => {
    const interval = setInterval(() => {
      if (pet) {
        const updates = tadpoleState.exportToPet();
        if (updates.attributes && pet.attributes.growth !== updates.attributes?.growth) {
          onPetUpdate(updates);
        }
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [pet, tadpoleState, onPetUpdate]);
  
  const handleFeed = (foodType: 'algae' | 'plankton') => {
    tadpoleState.feedTadpole(foodType);
    setIsInteracting(true);
    setTimeout(() => setIsInteracting(false), 2000);
    
    // 同步到主系统
    const updates = tadpoleState.exportToPet();
    onPetUpdate(updates);
  };
  
  const handleInteract = (type: 'poke' | 'stroke' | 'observe') => {
    tadpoleState.interact(type);
    setIsInteracting(true);
    setTimeout(() => setIsInteracting(false), 1000);
  };
  
  const handleEnvironmentChange = (updates: Partial<WaterEnvironment>) => {
    tadpoleState.updateEnvironment(updates);
  };
  
  const healthStatus = tadpoleState.getHealthStatus();
  const growthRate = tadpoleState.getGrowthRate();
  
  if (!pet) {
    return (
      <div className="tadpole-view-empty">
        <p>没有宠物数据</p>
      </div>
    );
  }
  
  return (
    <div className="tadpoleview">
      {/* 蝌蚪展示区 */}
      <div className="tadpole-display">
        <Tadpole
          stage={tadpoleState.tadpoleStage}
          features={tadpoleState.features}
          environment={tadpoleState.environment}
          growth={pet.attributes.growth}
          isEating={isInteracting}
          isMoving={!isInterInteracting}
          onEnvironmentChange={handleEnvironmentChange}
        />
      </div>
      
      {/* 控制面板 */}
      <div className="tadpole-controls">
        {/* 健康状态指示 */}
        <div className={`health-status ${healthStatus}`}>
          <span className="status-icon">
            {healthStatus === 'healthy' ? '💚' : healthStatus === 'stressed' ? '⚠️' : '🚨'}
          </span>
          <span className="status-text">
            {healthStatus === 'healthy' ? '健康' : healthStatus === 'stressed' ? '压力大' : '危急'}
          </span>
        </div>
        
        {/* 成长速率 */}
        <div className="growth-rate">
          <span className="rate-label">成长速率</span>
          <span className="rate-value">{growthRate.toFixed(2)}x</span>
        </div>
        
        {/* 喂食按钮 */}
        <div className="feed-buttons">
          <button 
            className="feed-btn algae"
            onClick={() => handleFeed('algae')}
            disabled={isInteracting}
          >
            <span className="btn-icon">🌿</span>
            <span className="btn-label">藻类</span>
            <span className="btn-effect">+3 成长</span>
          </button>
          
          <button 
            className="feed-btn plankton"
            onClick={() => handleFeed('plankton')}
            disabled={isInteracting}
          >
            <span className="btn-icon">💙</span>
            <span className="btn-label">浮游生物</span>
            <span className="btn-effect">+2 成长</span>
          </button>
        </div>
        
        {/* 互动按钮 */}
        <div className="interaction-buttons">
          <button 
            className="interact-btn"
            onClick={() => handleInteract('poke')}
            disabled={isInteracting}
          >
            <span className="btn-icon">👆</span>
            <span className="btn-label">戳一戳</span>
          </button>
          
          <button 
            className="interact-btn"
            onClick={() => handleInteract('stroke')}
            disabled={isInteracting}
          >
            <span className="btn-icon">✨</span>
            <span className="btn-label">抚摸</span>
          </button>
          
          <button 
            className="interact-btn"
            onClick={() => handleInteract('observe')}
            disabled={isInteracting}
          >
            <span className="btn-icon">👀</span>
            <span className="btn-label">观察</span>
          </button>
        </div>
        
        {/* 环境控制开关 */}
        <button 
          className="env-control-toggle"
          onClick={() => setShowEnvironmentControls(!showEnvironmentControls)}
        >
          <span>{showEnvironmentControls ? '🔼' : '🔽'}</span>
          <span>环境控制</span>
        </button>
        
        {/* 环境控制面板 */}
        {showEnvironmentControls && (
          <motion.div 
            className="env-controls"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div className="env-control-group">
              <label>温度</label>
              <input
                type="range"
                min="15"
                max="30"
                value={tadpoleState.environment.temperature}
                onChange={(e) => handleEnvironmentChange({ temperature: parseFloat(e.target.value) })}
              />
              <span>{tadpoleState.environment.temperature}°C</span>
            </div>
            
            <div className="env-control-group">
              <label>氧气</label>
              <input
                type="range"
                min="0"
                max="100"
                value={tadpoleState.environment.oxygen}
                onChange={(e) => handleEnvironmentChange({ oxygen: parseFloat(e.target.value) })}
              />
              <span>{tadpoleState.environment.oxygen}%</span>
            </div>
            
            <div className="env-control-group">
              <label>水质</label>
              <input
                type="range"
                min="0"
                max="100"
                value={tadpoleState.environment.cleanliness}
                onChange={(e) => handleEnvironmentChange({ cleanliness: parseFloat(e.target.value) })}
              />
              <span>{tadpoleState.environment.cleanliness}%</span>
            </div>
            
            <div className="env-control-group">
              <label>水流速度</label>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={tadpoleState.environment.flowSpeed}
                onChange={(e) => handleEnvironmentChange({ flowSpeed: parseFloat(e.target.value) })}
              />
              <span>{tadpoleState.environment.flowSpeed.toFixed(1)}</span>
            </div>
          </motion.div>
        )}
        
        {/* 进化按钮 */}
        {tadpoleState.canEvolveToFrog && (
          <motion.button
            className="evolve-btn"
            onClick={onEvolve}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="btn-icon">🐸</span>
            <span className="btn-label">进化为青蛙</span>
            <span className="btn-hint">成长 {Math.round(pet.attributes.growth)}%</span>
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default TadpoleView;
