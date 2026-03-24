import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Gift, MapPin, Clock, ChevronRight } from 'lucide-react';
import { Button } from '../common/Button';
import { ScaleOnHover } from '../common/animations/FadeIn';
import type { Friend } from '../../types';
import { buildMemoryPalacePath } from '../../features/memory-palace/routes';

interface FriendCardProps {
  friend: Friend;
  index?: number;
  onMessage?: (friend: Friend) => void;
  onGift?: (friend: Friend) => void;
  onVisit?: (friend: Friend) => void;
}

export function FriendCard({ 
  friend, 
  index = 0, 
  onMessage, 
  onGift, 
  onVisit 
}: FriendCardProps) {
  const navigate = useNavigate();

  const statusConfig = {
    online: { color: 'bg-green-500', text: '在线' },
    offline: { color: 'bg-gray-400', text: '离线' },
    traveling: { color: 'bg-blue-500', text: '旅行中' },
    sleeping: { color: 'bg-purple-500', text: '休息中' },
  };

  const config = statusConfig[friend.status] || statusConfig.offline;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="group"
    >
      <ScaleOnHover scale={1.02}>
        <div className="relative bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300">
          {/* Header with Avatar and Status */}
          <div className="p-4 flex items-center gap-3">
            {/* Avatar */}
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-2xl shadow-md">
                {friend.avatar || '🐸'}
              </div>
              {/* Status Indicator */}
              <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${config.color}`} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate text-base">
                {friend.name || 'Frog Friend'}
              </h3>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${config.color}`} />
                <span>{config.text}</span>
                {friend.lastSeen && (
                  <>
                    <span className="text-gray-300">•</span>
                    <Clock size={10} />
                    <span>{friend.lastSeen}</span>
                  </>
                )}
              </p>
            </div>

            {/* Chevron */}
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-500 transition-colors" />
          </div>

          {/* Stats Row */}
          <div className="px-4 pb-3 flex items-center gap-4 text-sm text-gray-600">
            {friend.location && (
              <div className="flex items-center gap-1">
                <MapPin size={14} className="text-green-500" />
                <span className="truncate max-w-[100px]">{friend.location}</span>
              </div>
            )}
            {friend.commonFriends !== undefined && (
              <div className="flex items-center gap-1">
                <span className="text-green-500 font-medium">{friend.commonFriends}</span>
                <span>个共同好友</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="px-4 pb-4 grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMessage?.(friend)}
              icon={<MessageCircle size={14} />}
            >
              消息
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onGift?.(friend)}
              icon={<Gift size={14} />}
            >
              礼物
            </Button>
              <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (onVisit) {
                  onVisit(friend);
                  return;
                }
                navigate(buildMemoryPalacePath(friend.id));
              }}
            >
              拜访
            </Button>
          </div>
        </div>
      </ScaleOnHover>
    </motion.div>
  );
}
