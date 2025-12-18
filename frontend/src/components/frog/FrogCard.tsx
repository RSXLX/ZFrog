import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Frog } from '../../types';

interface FrogCardProps {
  frog: Frog;
}

export function FrogCard({ frog }: FrogCardProps) {
  const statusColors = {
    Idle: 'bg-green-100 text-green-800',
    Traveling: 'bg-blue-100 text-blue-800',
    Returning: 'bg-yellow-100 text-yellow-800',
  };
  
  const statusText = {
    Idle: '在家',
    Traveling: '旅行中',
    Returning: '返程中',
  };
  
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-white rounded-2xl shadow-lg overflow-hidden"
    >
      <Link to={`/frog/${frog.tokenId}`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-4xl">🐸</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[frog.status]}`}>
              {statusText[frog.status]}
            </span>
          </div>
          
          <h3 className="text-lg font-bold text-gray-800 mb-2">
            {frog.name}
          </h3>
          
          <div className="text-sm text-gray-500 space-y-1">
            <p>🎂 生日: {new Date(frog.birthday).toLocaleDateString()}</p>
            <p>🗺️ 旅行次数: {frog.totalTravels}</p>
            <p>⭐ 等级: Lv.{frog.level} (XP: {frog.xp})</p>
            <p>📍 Token ID: #{frog.tokenId}</p>
          </div>
        </div>
        
        <div className="px-6 py-3 bg-gray-50 border-t">
          <span className="text-sm text-green-600 font-medium">
            查看详情 →
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
