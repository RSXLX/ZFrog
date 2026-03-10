import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, MessageSquare, Gift, Award } from 'lucide-react';
import { Button } from '../common/Button';
import { ScaleOnHover } from '../common/animations/FadeIn';
import type { Garden } from '../../types';

interface GardenCardProps {
  garden: Garden;
  index?: number;
}

export function GardenCard({ garden, index = 0 }: GardenCardProps) {
  const navigate = useNavigate();

  const stats = [
    { icon: Users, label: '访客', value: garden.visitorCount || 0 },
    { icon: MessageSquare, label: '留言', value: garden.messageCount || 0 },
    { icon: Gift, label: '礼物', value: garden.giftCount || 0 },
    { icon: Award, label: '徽章', value: garden.badgeCount || 0 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="group"
    >
      <ScaleOnHover scale={1.02}>
        <div className="relative bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-shadow duration-300">
          {/* Garden Preview */}
          <div className="relative h-48 bg-gradient-to-br from-green-100 to-emerald-100 overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl">🏡</span>
            </div>
            
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-green-400" />
              <div className="absolute top-8 right-8 w-6 h-6 rounded-full bg-emerald-400" />
              <div className="absolute bottom-4 left-8 w-4 h-4 rounded-full bg-teal-400" />
            </div>

            {/* Owner Badge */}
            <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-sm">
              <span className="text-lg">🐸</span>
              <span className="text-sm font-medium text-gray-800 truncate max-w-[120px]">
                {garden.ownerName || 'Frog Owner'}
              </span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-2 p-4 border-b border-gray-100">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                  <stat.icon size={14} />
                  <span className="text-xs">{stat.label}</span>
                </div>
                <p className="text-lg font-bold text-gray-800">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Action Button */}
          <div className="p-4">
            <Button
              variant="primary"
              fullWidth
              onClick={() => navigate(`/garden/${garden.id}`)}
            >
              参观家园
            </Button>
          </div>
        </div>
      </ScaleOnHover>
    </motion.div>
  );
}
