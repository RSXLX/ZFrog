/**
 * 🐸 宠物蛋系统 - 商店面板
 */

import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useLilyBalance } from '../../hooks/useFrogNurture';

type ShopCategory = 'FOOD' | 'MEDICINE' | 'BOOST' | 'DECORATION' | 'SPECIAL';

interface ShopItem {
  id: number;
  name: string;
  description: string | null;
  category: ShopCategory;
  priceLily: number;
  priceZeta: number;
  effect: string | null;
  effectValue: number;
  icon: string | null;
  requiredLevel: number;
  isLimited: boolean;
  canBuy: boolean;
  reason?: string;
}

interface ShopPanelProps {
  ownerAddress: string;
  onPurchase?: () => void;
}

const CATEGORY_NAMES: Record<ShopCategory, { name: string; icon: string }> = {
  FOOD: { name: '食物', icon: '🍽️' },
  MEDICINE: { name: '药品', icon: '💊' },
  BOOST: { name: '增益', icon: '⚡' },
  DECORATION: { name: '装饰', icon: '🏠' },
  SPECIAL: { name: '特殊', icon: '💎' },
};

export function ShopPanel({ ownerAddress, onPurchase }: ShopPanelProps) {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ShopCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { balance, refresh: refreshBalance } = useLilyBalance(ownerAddress);

  // 获取商品列表
  const fetchItems = async () => {
    try {
      setLoading(true);
      const params: any = { ownerAddress };
      if (selectedCategory) {
        params.category = selectedCategory;
      }
      const response = await apiService.get('/shop/items', { params });
      if (response.data.success) {
        setItems(response.data.data.items);
        if (categories.length === 0) {
          setCategories(response.data.data.categories);
        }
      }
    } catch (err) {
      console.error('Failed to fetch shop items:', err);
      setError('加载商店失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ownerAddress) {
      fetchItems();
    }
  }, [ownerAddress, selectedCategory]);

  // 购买商品
  const purchase = async (itemId: number) => {
    try {
      setPurchasing(itemId);
      setMessage(null);
      
      const response = await apiService.post('/shop/purchase', {
        ownerAddress,
        itemId,
      });

      if (response.data.success) {
        setMessage({
          type: 'success',
          text: `成功购买 ${response.data.item.name}！`,
        });
        // 刷新数据
        await fetchItems();
        await refreshBalance();
        onPurchase?.();
      } else {
        setMessage({
          type: 'error',
          text: response.data.error || '购买失败',
        });
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || '购买失败',
      });
    } finally {
      setPurchasing(null);
    }
  };

  // 按分类分组
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<ShopCategory, ShopItem[]>);

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-green-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 标题和余额 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          🛒 商店
        </h3>
        <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-100 to-yellow-100 
                      border-2 border-amber-200 text-amber-700 font-medium">
          💰 {balance?.balance ?? 0} $LILY
        </div>
      </div>

      {/* 提示消息 */}
      {message && (
        <div
          className={`p-3 rounded-xl text-sm ${
            message.type === 'success'
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-red-100 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 分类筛选 */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap
            ${!selectedCategory 
              ? 'bg-green-500 text-white shadow-lg' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          全部
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap
              ${selectedCategory === cat 
                ? 'bg-green-500 text-white shadow-lg' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {CATEGORY_NAMES[cat]?.icon} {CATEGORY_NAMES[cat]?.name}
          </button>
        ))}
      </div>

      {/* 商品列表 */}
      {selectedCategory ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {(groupedItems[selectedCategory] || []).map((item) => (
            <ShopItemCard
              key={item.id}
              item={item}
              purchasing={purchasing === item.id}
              onPurchase={() => purchase(item.id)}
            />
          ))}
        </div>
      ) : (
        Object.entries(groupedItems).map(([category, categoryItems]) => (
          <div key={category} className="space-y-2">
            <h4 className="font-medium text-gray-700 flex items-center gap-2">
              {CATEGORY_NAMES[category as ShopCategory]?.icon}
              {CATEGORY_NAMES[category as ShopCategory]?.name}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {categoryItems.map((item) => (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  purchasing={purchasing === item.id}
                  onPurchase={() => purchase(item.id)}
                />
              ))}
            </div>
          </div>
        ))
      )}

      {/* 空状态 */}
      {items.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          商店暂无商品
        </div>
      )}
    </div>
  );
}

// 商品卡片组件
function ShopItemCard({
  item,
  purchasing,
  onPurchase,
}: {
  item: ShopItem;
  purchasing: boolean;
  onPurchase: () => void;
}) {
  return (
    <div
      className={`
        p-4 rounded-2xl transition-all duration-300
        ${item.canBuy 
          ? 'bg-white border-2 border-gray-100 hover:border-green-200 hover:shadow-lg cursor-pointer' 
          : 'bg-gray-50 border-2 border-gray-100 opacity-60'}
        shadow-[4px_4px_8px_#e0e0e0,-4px_-4px_8px_#ffffff]
      `}
    >
      {/* 图标和名称 */}
      <div className="text-center mb-3">
        <span className="text-3xl">{item.icon || '📦'}</span>
        <div className="font-medium text-gray-800 mt-1">{item.name}</div>
        {item.isLimited && (
          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
            限定
          </span>
        )}
      </div>

      {/* 描述 */}
      {item.description && (
        <div className="text-xs text-gray-500 text-center mb-3 line-clamp-2">
          {item.description}
        </div>
      )}

      {/* 价格和购买 */}
      <div className="space-y-2">
        <div className="text-center text-amber-600 font-medium">
          {item.priceLily} 🪷
        </div>

        {item.canBuy ? (
          <button
            onClick={onPurchase}
            disabled={purchasing}
            className="w-full py-2 rounded-xl bg-gradient-to-r from-green-400 to-emerald-500 
                     text-white text-sm font-medium hover:from-green-500 hover:to-emerald-600
                     transition-all duration-300 shadow-md hover:shadow-lg
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {purchasing ? '购买中...' : '购买'}
          </button>
        ) : (
          <div className="w-full py-2 rounded-xl bg-gray-100 text-gray-400 text-sm text-center">
            {item.reason || '无法购买'}
          </div>
        )}
      </div>
    </div>
  );
}

export default ShopPanel;
