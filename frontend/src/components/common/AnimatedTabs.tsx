/**
 * AnimatedTabs - 带滑动动画的 Tab 组件
 * 使用 framer-motion 实现平滑的指示器滑动效果
 */

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  badge?: boolean | number;
}

interface AnimatedTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function AnimatedTabs({ tabs, activeTab, onTabChange, className = '' }: AnimatedTabsProps) {
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // 计算指示器位置
  useEffect(() => {
    const activeIndex = tabs.findIndex(tab => tab.id === activeTab);
    const activeRef = tabRefs.current[activeIndex];
    
    if (activeRef) {
      setIndicatorStyle({
        left: activeRef.offsetLeft,
        width: activeRef.offsetWidth,
      });
    }
  }, [activeTab, tabs]);

  return (
    <div className={`relative flex p-1 bg-gray-100 rounded-2xl ${className}`}>
      {/* 滑动指示器 */}
      <motion.div
        className="absolute top-1 bottom-1 bg-white rounded-xl shadow-sm"
        initial={false}
        animate={{
          left: indicatorStyle.left,
          width: indicatorStyle.width,
        }}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 35,
        }}
      />

      {/* Tab 按钮 */}
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          ref={el => tabRefs.current[index] = el}
          onClick={() => !tab.disabled && onTabChange(tab.id)}
          disabled={tab.disabled}
          className={`
            relative z-10 flex-1 py-2.5 px-4 rounded-xl font-medium text-sm
            transition-colors duration-200 flex items-center justify-center gap-1.5
            ${activeTab === tab.id
              ? 'text-gray-800'
              : tab.disabled
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-500 hover:text-gray-700'
            }
          `}
        >
          {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
          <span>{tab.label}</span>
          
          {/* 徽章 */}
          {tab.badge && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`
                ml-1 flex-shrink-0
                ${typeof tab.badge === 'number'
                  ? 'px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full min-w-[18px] text-center'
                  : 'w-2 h-2 bg-red-500 rounded-full'
                }
              `}
            >
              {typeof tab.badge === 'number' ? tab.badge : null}
            </motion.span>
          )}
        </button>
      ))}
    </div>
  );
}

export default AnimatedTabs;
