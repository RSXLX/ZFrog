/**
 * DiscoveryList Component
 * 
 * Container for displaying all discoveries from cross-chain travel
 * with category filtering, loading state and empty state handling
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DiscoveryCard, DiscoveryData } from './DiscoveryCard';

interface DiscoveryListProps {
  travelId: number;
  discoveries?: DiscoveryData[];
  isLoading?: boolean;
  showCategories?: boolean;
}

type CategoryFilter = 'all' | 'treasure' | 'landmark' | 'encounter' | 'wisdom' | 'rare';

const categoryConfig: Record<CategoryFilter, { label: string; icon: string; color: string }> = {
  all: { label: '全部', icon: '📋', color: 'bg-gray-500' },
  treasure: { label: '宝藏', icon: '💰', color: 'bg-yellow-500' },
  landmark: { label: '地标', icon: '🏛️', color: 'bg-blue-500' },
  encounter: { label: '邂逅', icon: '👤', color: 'bg-green-500' },
  wisdom: { label: '智慧', icon: '📜', color: 'bg-purple-500' },
  rare: { label: '稀有', icon: '🌟', color: 'bg-orange-500' },
};

export function DiscoveryList({ 
  travelId, 
  discoveries: propDiscoveries, 
  isLoading: propLoading,
  showCategories = true 
}: DiscoveryListProps) {
  const [discoveries, setDiscoveries] = useState<DiscoveryData[]>(propDiscoveries || []);
  const [isLoading, setIsLoading] = useState(propLoading ?? true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');

  // Fetch discoveries from API if not provided as props
  useEffect(() => {
    if (propDiscoveries) {
      setDiscoveries(propDiscoveries);
      setIsLoading(false);
      return;
    }

    async function fetchDiscoveries() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/cross-chain/travel/${travelId}/discoveries`);
        const data = await response.json();
        
        if (data.success && data.data?.discoveries) {
          setDiscoveries(data.data.discoveries);
        } else {
          setError('无法加载发现数据');
        }
      } catch (err) {
        setError('加载失败');
        console.error('Failed to fetch discoveries:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDiscoveries();
  }, [travelId, propDiscoveries]);

  // Calculate category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryFilter, number> = {
      all: discoveries.length,
      treasure: 0,
      landmark: 0,
      encounter: 0,
      wisdom: 0,
      rare: 0,
    };
    
    discoveries.forEach(d => {
      const type = d.type?.toLowerCase() as CategoryFilter;
      if (counts[type] !== undefined) {
        counts[type]++;
      }
      if (d.rarity === 'epic' || d.rarity === 'legendary') {
        counts.rare++;
      }
    });
    
    return counts;
  }, [discoveries]);

  // Filter discoveries by category
  const filteredDiscoveries = useMemo(() => {
    if (activeCategory === 'all') return discoveries;
    if (activeCategory === 'rare') {
      return discoveries.filter(d => d.rarity === 'epic' || d.rarity === 'legendary');
    }
    return discoveries.filter(d => d.type?.toLowerCase() === activeCategory);
  }, [discoveries, activeCategory]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          🔍 链上发现
        </h4>
        {[1, 2, 3].map((i) => (
          <div 
            key={i}
            className="bg-white/50 rounded-xl p-4 animate-pulse"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <span className="text-red-600 text-sm">{error}</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (discoveries.length === 0) {
    return (
      <div className="p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          🔍 链上发现
        </h4>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-gray-50 rounded-xl p-6 text-center"
        >
          <span className="text-4xl">🐸</span>
          <p className="text-gray-500 text-sm mt-2">正在探索中，暂无发现...</p>
          <p className="text-gray-400 text-xs mt-1">青蛙会在旅途中发现有趣的链上信息</p>
        </motion.div>
      </div>
    );
  }

  // Discovery list with categories
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          🔍 链上发现
          <span className="bg-purple-100 text-purple-600 text-xs px-2 py-0.5 rounded-full">
            {discoveries.length}
          </span>
        </h4>
      </div>

      {/* Category Tabs */}
      {showCategories && (
        <div className="flex flex-wrap gap-2 mb-3">
          {(Object.keys(categoryConfig) as CategoryFilter[]).map((cat) => {
            const config = categoryConfig[cat];
            const count = categoryCounts[cat];
            if (cat !== 'all' && count === 0) return null;
            
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                  activeCategory === cat
                    ? `${config.color} text-white`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{config.icon}</span>
                <span>{config.label}</span>
                <span className={`ml-1 ${activeCategory === cat ? 'opacity-80' : 'text-gray-400'}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      )}
      
      <div className="space-y-3 max-h-64 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {filteredDiscoveries.map((discovery, index) => (
            <DiscoveryCard 
              key={discovery.id} 
              discovery={discovery} 
              index={index}
            />
          ))}
        </AnimatePresence>
        
        {filteredDiscoveries.length === 0 && activeCategory !== 'all' && (
          <div className="text-center py-4 text-gray-400 text-sm">
            没有 {categoryConfig[activeCategory].label} 类型的发现
          </div>
        )}
      </div>
    </div>
  );
}
