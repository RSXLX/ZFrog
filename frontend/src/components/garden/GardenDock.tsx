import React from 'react';
import { motion } from 'framer-motion';

interface DockItem {
  id: string;
  icon: string;
  label: string;
  count?: number;
  onClick: () => void;
}

interface GardenDockProps {
  items: DockItem[];
}

export const GardenDock: React.FC<GardenDockProps> = ({ items }) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <motion.div 
        className="flex items-end gap-3 px-4 py-3 bg-white/20 backdrop-blur-xl border border-white/30 rounded-2xl shadow-2xl"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        {items.map((item) => (
          <DockItem key={item.id} item={item} />
        ))}
      </motion.div>
    </div>
  );
};

const DockItem: React.FC<{ item: DockItem }> = ({ item }) => {
  return (
    <motion.button
      className="relative group flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-white/10 hover:bg-white/30 transition-colors"
      onClick={item.onClick}
      whileHover={{ scale: 1.2, y: -5 }}
      whileTap={{ scale: 0.9 }}
    >
      <span className="text-2xl filter drop-shadow-md">{item.icon}</span>
      
      {/* Badge count */}
      {item.count !== undefined && item.count > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
          {item.count > 9 ? '9+' : item.count}
        </span>
      )}

      {/* Tooltip */}
      <span className="absolute -top-10 scale-0 group-hover:scale-100 transition-transform bg-black/75 text-white text-xs px-2 py-1 rounded backdrop-blur-sm whitespace-nowrap pointer-events-none">
        {item.label}
      </span>
    </motion.button>
  );
};
