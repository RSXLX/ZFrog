import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { MapPin, Clock, Star, ArrowRight } from 'lucide-react';
import { Travel } from '../../types';
import { Button } from '../common/Button';
import { ScaleOnHover } from '../common/animations/FadeIn';

interface TravelCardProps {
  travel: Travel;
  index?: number;
  onClick?: () => void;
}

export function TravelCard({ travel, index = 0, onClick }: TravelCardProps) {
  const navigate = useNavigate();

  const statusConfig = {
    Active: {
      color: 'bg-blue-500',
      text: '进行中',
      icon: Clock,
    },
    Completed: {
      color: 'bg-green-500',
      text: '已完成',
      icon: Star,
    },
    Cancelled: {
      color: 'bg-gray-500',
      text: '已取消',
      icon: MapPin,
    },
  };

  const config = statusConfig[travel.status] || statusConfig.Completed;
  const StatusIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="group"
    >
      <ScaleOnHover scale={1.02}>
        <div className="relative bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-shadow duration-300">
          {/* Status Badge */}
          <div className={`absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-medium ${config.color}`}>
            <StatusIcon size={14} />
            <span>{config.text}</span>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Destination */}
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-2xl">
                🐸
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">
                  {travel.destination || '未知目的地'}
                </h3>
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                  <MapPin size={12} />
                  <span className="truncate">{travel.chain || 'ZetaChain'}</span>
                </p>
              </div>
            </div>

            {/* Duration & Time */}
            <div className="flex items-center justify-between text-sm text-gray-500 mb-4 pb-4 border-b border-gray-100">
              <span>持续时间: {Math.round((travel.duration || 3600) / 60)} 分钟</span>
              <span>
                {formatDistanceToNow(new Date(travel.startedAt || Date.now()), {
                  addSuffix: true,
                  locale: zhCN,
                })}
              </span>
            </div>

            {/* Rewards Preview */}
            {travel.souvenir && (
              <div className="flex items-center gap-2 mb-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                <span className="text-2xl">🎁</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-900 truncate">
                    {travel.souvenir.name || '神秘纪念品'}
                  </p>
                  <p className="text-xs text-amber-700 truncate">
                    {travel.souvenir.rarity || '普通'}
                  </p>
                </div>
              </div>
            )}

            {/* Action Button */}
            <Button
              variant="primary"
              fullWidth
              onClick={() => onClick?.() ?? navigate(`/travel-detail/${travel.id}`)}
              icon={<ArrowRight size={18} />}
              iconPosition="right"
            >
              {travel.status === 'Active' ? '查看进度' : '查看详情'}
            </Button>
          </div>
        </div>
      </ScaleOnHover>
    </motion.div>
  );
}
