import { useState, useEffect } from 'react';
import { FrogData } from '../types/frogAnimation';

// 模拟青蛙数据
const mockFrogs: FrogData[] = [
  {
    id: 1,
    name: '小绿',
    status: 'idle' as any,
    mood: 'neutral' as any,
    energy: 80,
    hunger: 50,
    happiness: 70,
    owner: '',
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7天前
    lastInteraction: Date.now() - 10 * 60 * 1000, // 10分钟前
  },
  {
    id: 2,
    name: '呱呱',
    status: 'sleeping' as any,
    mood: 'happy' as any,
    energy: 30,
    hunger: 70,
    happiness: 85,
    owner: '',
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3天前
    lastInteraction: Date.now() - 30 * 60 * 1000, // 30分钟前
  },
];

export function useFrogData(ownerAddress?: string) {
  const [frogs, setFrogs] = useState<FrogData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFrog, setActiveFrog] = useState<FrogData | null>(null);

  useEffect(() => {
    // 模拟加载青蛙数据
    const loadFrogs = async () => {
      setLoading(true);
      
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 过滤属于当前用户的青蛙
      const userFrogs = ownerAddress ? mockFrogs : mockFrogs.slice(0, 1);
      setFrogs(userFrogs);
      
      // 设置第一只青蛙为活跃青蛙
      if (userFrogs.length > 0) {
        setActiveFrog(userFrogs[0]);
      }
      
      setLoading(false);
    };

    loadFrogs();
  }, [ownerAddress]);

  // 切换活跃青蛙
  const selectFrog = (frogId: number) => {
    const frog = frogs.find(f => f.id === frogId);
    if (frog) {
      setActiveFrog(frog);
    }
  };

  // 更新青蛙状态
  const updateFrogStatus = (frogId: number, status: any) => {
    setFrogs(prev => prev.map(frog => 
      frog.id === frogId 
        ? { ...frog, status, lastInteraction: Date.now() }
        : frog
    ));
    
    if (activeFrog && activeFrog.id === frogId) {
      setActiveFrog(prev => prev ? { ...prev, status, lastInteraction: Date.now() } : null);
    }
  };

  // 更新青蛙属性
  const updateFrogAttributes = (frogId: number, attributes: Partial<FrogData>) => {
    setFrogs(prev => prev.map(frog => 
      frog.id === frogId 
        ? { ...frog, ...attributes, lastInteraction: Date.now() }
        : frog
    ));
    
    if (activeFrog && activeFrog.id === frogId) {
      setActiveFrog(prev => prev ? { ...prev, ...attributes, lastInteraction: Date.now() } : null);
    }
  };

  return {
    frogs,
    activeFrog,
    loading,
    selectFrog,
    updateFrogStatus,
    updateFrogAttributes,
  };
}