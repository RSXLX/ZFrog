import React, { useState } from 'react';
import { useCollectionBook, FrogSpecies } from '../hooks/useCollectionBook';
import './CollectionBookView.css';

interface CollectionBookViewProps {
  onClose: () => void;
  collectionHook: ReturnType<typeof useCollectionBook>;
}

// 模拟的图鉴全集（未解锁显示为 ???）
const ALL_SPECIES_DB: Partial<FrogSpecies>[] = [
  { id: 'frog_base', name: '草之蛙', rarity: 'starter', description: '最基础的青蛙品种，充满了生机。' },
  { id: 'frog_water', name: '水流蛙', rarity: 'uncommon', description: '喜欢在溪流中玩耍，皮肤湛蓝。' },
  { id: 'frog_fire', name: '烈焰蛙', rarity: 'rare', description: '体内蕴含火焰能量，非常罕见。' },
  { id: 'frog_void', name: '虚空蛙', rarity: 'epic', description: '从时空裂缝中诞生的神秘物种。' },
  { id: 'frog_star', name: '星神蛙', rarity: 'legendary', description: '传说中可以与群星沟通的至高存在。' }
];

export const CollectionBookView: React.FC<CollectionBookViewProps> = ({ onClose, collectionHook }) => {
  const { collection, getUnlockedList } = collectionHook;
  const [selectedSpecies, setSelectedSpecies] = useState<FrogSpecies | null>(null);

  const unlockedList = getUnlockedList();
  
  const handleCardClick = (baseSpecies: Partial<FrogSpecies>) => {
    if (collection.species[baseSpecies.id!]) {
      setSelectedSpecies(collection.species[baseSpecies.id!]);
    }
  };

  return (
    <div className="collection-book-overlay">
      <div className="collection-book-container">
        <div className="collection-header">
          <h2>🐸 变异图鉴</h2>
          <button className="close-btn" onClick={onClose}>✖</button>
        </div>
        
        <div className="collection-content">
          <div className="collection-sidebar">
            <div className="stats-panel">
              <h3>收集进度</h3>
              <p>已解锁: {collection.totalUnlocked} / {ALL_SPECIES_DB.length}</p>
              <progress value={collection.totalUnlocked} max={ALL_SPECIES_DB.length} style={{ width: '100%' }}></progress>
            </div>
            
            <div className="achievements-panel">
              <h4>🏆 成就</h4>
              {collection.achievements.length > 0 ? (
                collection.achievements.map((ach, idx) => (
                  <div key={idx} className="achievement-badge">{ach}</div>
                ))
              ) : (
                <p style={{color: '#888', fontSize: '14px'}}>暂无成就</p>
              )}
            </div>
          </div>
          
          <div className="species-grid">
            {ALL_SPECIES_DB.map(base => {
              const isUnlocked = !!collection.species[base.id!];
              const displayData = isUnlocked ? collection.species[base.id!] : base;
              
              return (
                <div 
                  key={base.id} 
                  className={`species-card ${!isUnlocked ? 'locked' : ''}`}
                  onClick={() => handleCardClick(base)}
                >
                  <div className="species-image-placeholder">
                    {isUnlocked ? '🐸' : '❓'}
                  </div>
                  <div className="species-name">{isUnlocked ? displayData.name : '未知物种'}</div>
                  <div className={`rarity-tag rarity-${displayData.rarity}`}>
                    {displayData.rarity}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedSpecies && (
        <div className="species-detail-modal" onClick={() => setSelectedSpecies(null)}>
          <div className="detail-content" onClick={e => e.stopPropagation()}>
            <button className="close-btn" style={{position: 'absolute', right: '15px', top: '15px', color: '#333'}} onClick={() => setSelectedSpecies(null)}>✖</button>
            <div className="detail-image-large">🐸</div>
            <h3>{selectedSpecies.name}</h3>
            <div className={`rarity-tag rarity-${selectedSpecies.rarity}`} style={{display: 'inline-block', marginBottom: '15px'}}>
              {selectedSpecies.rarity}
            </div>
            <p className="detail-desc">{selectedSpecies.description}</p>
            
            {selectedSpecies.traits && selectedSpecies.traits.length > 0 && (
              <div className="traits-list">
                {selectedSpecies.traits.map((trait, idx) => (
                  <span key={idx} className="trait-tag">{trait}</span>
                ))}
              </div>
            )}
            
            <p style={{marginTop: '20px', fontSize: '12px', color: '#999'}}>
              解锁时间: {selectedSpecies.unlockedAt ? new Date(selectedSpecies.unlockedAt).toLocaleString() : '未知'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
