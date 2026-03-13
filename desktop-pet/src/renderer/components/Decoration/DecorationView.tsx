import React, { useState, useEffect, useRef } from 'react';
import { useDecoration } from '../../hooks/useDecoration';
import { useInventory } from '../../hooks/useInventory';
import './DecorationView.css';

export const DecorationView: React.FC = () => {
  const { decorations, updateDecoration, removeDecoration, placeDecoration } = useDecoration();
  const { items, addItem, removeItem } = useInventory();
  
  const [isEditing, setIsEditing] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  
  const handleDragStart = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    if (!isEditing) return;
    setDraggingId(id);
  };

  const handleDrag = (e: MouseEvent | TouchEvent) => {
    if (!isEditing || !draggingId) return;

    let clientX = 0;
    let clientY = 0;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    updateDecoration(draggingId, { x: clientX - 20, y: clientY - 20 });
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  useEffect(() => {
    if (draggingId) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDrag);
      window.addEventListener('touchend', handleDragEnd);
      
      return () => {
        window.removeEventListener('mousemove', handleDrag);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchmove', handleDrag);
        window.removeEventListener('touchend', handleDragEnd);
      };
    }
  }, [draggingId, isEditing]);

  const handleRemoveDecoration = (id: string, itemId: string) => {
    if (!isEditing) return;
    removeDecoration(id);
    addItem(itemId, 1); // Return item back to inventory
  };

  const handleDropToPlace = (itemId: string, x: number, y: number) => {
    const item = items.find(i => i.id === itemId);
    if (!item || item.quantity <= 0 || item.type !== 'decoration') return;
    
    placeDecoration(itemId, x, y);
    removeItem(itemId, 1);
  };

  return (
    <>
      <div className="decoration-view">
        {decorations.map((dec) => {
          const itemData = items.find(i => i.id === dec.itemId) || { icon: '❓', name: 'Unknown' };
          
          return (
            <div
              key={dec.id}
              className="decoration-item"
              style={{
                left: dec.x,
                top: dec.y,
                transform: `scale(${dec.scale || 1}) rotate(${dec.rotation || 0}deg)`,
                zIndex: (dec.zIndex || 5) + (draggingId === dec.id ? 10 : 0)
              }}
              onMouseDown={(e) => handleDragStart(dec.id, e)}
              onTouchStart={(e) => handleDragStart(dec.id, e)}
              onDoubleClick={() => handleRemoveDecoration(dec.id, dec.itemId)}
            >
              <span className="decoration-icon">{itemData.icon}</span>
              {isEditing && (
                <div 
                  style={{
                    position: 'absolute', top: -10, right: -10, 
                    background: 'red', color: 'white', borderRadius: '50%', 
                    width: 20, height: 20, display: 'flex', alignItems: 'center', 
                    justifyContent: 'center', fontSize: 12, cursor: 'pointer'
                  }}
                  onClick={(e) => { e.stopPropagation(); handleRemoveDecoration(dec.id, dec.itemId); }}
                >
                  ✕
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="decoration-tools">
        <button 
          className={`decoration-tool-btn ${isEditing ? 'active' : ''}`}
          onClick={() => setIsEditing(!isEditing)}
          title={isEditing ? '退出编辑模式' : '编辑装饰 (双击移除)'}
        >
          {isEditing ? '✓' : '🛠️'}
        </button>
      </div>
    </>
  );
};
