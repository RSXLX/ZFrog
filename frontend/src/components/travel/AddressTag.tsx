// frontend/src/components/travel/AddressTag.tsx
// V2.0 地址类型标签组件

import React from 'react';
import './AddressTag.css';

export type AddressType = 'normal' | 'contract' | 'defi' | 'whale';

interface AddressTagProps {
  type: AddressType;
  bonus?: number;
  protocolName?: string;
  size?: 'small' | 'medium' | 'large';
  showBonus?: boolean;
}

const ADDRESS_TYPE_CONFIG: Record<AddressType, { emoji: string; label: string; color: string; bgColor: string }> = {
  normal: {
    emoji: '📍',
    label: '普通地址',
    color: '#9e9e9e',
    bgColor: 'rgba(158, 158, 158, 0.15)',
  },
  contract: {
    emoji: '🤖',
    label: '合约地址',
    color: '#64b5f6',
    bgColor: 'rgba(100, 181, 246, 0.15)',
  },
  defi: {
    emoji: '🏦',
    label: 'DeFi 协议',
    color: '#81c784',
    bgColor: 'rgba(129, 199, 132, 0.15)',
  },
  whale: {
    emoji: '🐋',
    label: '巨鲸地址',
    color: '#ffd54f',
    bgColor: 'rgba(255, 213, 79, 0.15)',
  },
};

export const AddressTag: React.FC<AddressTagProps> = ({
  type,
  bonus,
  protocolName,
  size = 'medium',
  showBonus = true,
}) => {
  const config = ADDRESS_TYPE_CONFIG[type];

  return (
    <div
      className={`address-tag address-tag--${size}`}
      style={{
        backgroundColor: config.bgColor,
        borderColor: config.color,
      }}
    >
      <span className="address-tag-emoji">{config.emoji}</span>
      <span className="address-tag-label" style={{ color: config.color }}>
        {protocolName || config.label}
      </span>
      {showBonus && bonus && bonus > 1 && (
        <span className="address-tag-bonus" style={{ backgroundColor: config.color }}>
          x{bonus.toFixed(1)}
        </span>
      )}
    </div>
  );
};

// 首位发现者 Gold Label
interface GoldLabelProps {
  discovererName: string;
  discoveredAt?: Date;
}

export const GoldLabel: React.FC<GoldLabelProps> = ({ discovererName, discoveredAt }) => {
  return (
    <div className="gold-label">
      <span className="gold-label-icon">🏆</span>
      <span className="gold-label-text">
        首位发现者: <strong>{discovererName}</strong>
      </span>
      {discoveredAt && (
        <span className="gold-label-date">
          {new Date(discoveredAt).toLocaleDateString()}
        </span>
      )}
    </div>
  );
};

// 幸运 Buff 标签
interface LuckyBuffTagProps {
  expiryTime?: Date;
}

export const LuckyBuffTag: React.FC<LuckyBuffTagProps> = ({ expiryTime }) => {
  const getTimeRemaining = () => {
    if (!expiryTime) return null;
    const now = new Date();
    const diff = expiryTime.getTime() - now.getTime();
    if (diff <= 0) return null;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const remaining = getTimeRemaining();

  return (
    <div className="lucky-buff-tag">
      <span className="lucky-buff-icon">🍀</span>
      <span className="lucky-buff-text">幸运爆发</span>
      {remaining && <span className="lucky-buff-timer">{remaining}</span>}
    </div>
  );
};

export default AddressTag;
