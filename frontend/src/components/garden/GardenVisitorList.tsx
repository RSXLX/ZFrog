import React from 'react';
import { motion } from 'framer-motion';
import { GardenVisit, VisitRequest } from '../../types/garden';

interface GardenVisitorListProps {
  visitors: GardenVisit[];
  pendingRequests: VisitRequest[];
  onAcceptVisit: (request: VisitRequest) => void;
  onRejectVisit: (request: VisitRequest) => void;
  onVisitorClick: (visit: GardenVisit) => void;
}

export const GardenVisitorList: React.FC<GardenVisitorListProps> = ({
  visitors,
  pendingRequests,
  onAcceptVisit,
  onRejectVisit,
  onVisitorClick
}) => {
  // 计算做客时长
  const getVisitDuration = (startedAt: Date | string) => {
    const start = new Date(startedAt);
    const now = new Date();
    const minutes = Math.floor((now.getTime() - start.getTime()) / 60000);
    return minutes;
  };

  return (
    <div className="h-full flex flex-col">
      {/* 当前访客 */}
      <div className="p-4 border-b">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <span>👥</span>
          <span>当前访客</span>
          <span className="text-sm text-gray-400">({visitors.length})</span>
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {visitors.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            <p className="text-2xl mb-2">🏠</p>
            <p className="text-sm">暂无访客</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {visitors.map((visit) => (
              <motion.div
                key={visit.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 cursor-pointer"
                onClick={() => onVisitorClick(visit)}
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🐸</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">
                      {visit.guestFrog?.name || `青蛙 #${visit.guestFrogId}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      ⏰ {getVisitDuration(visit.startedAt)} 分钟
                    </p>
                  </div>
                </div>
                
                {/* 快捷操作 */}
                <div className="flex gap-2 mt-2">
                  <button className="flex-1 text-sm py-1 bg-pink-100 hover:bg-pink-200 rounded text-pink-600">
                    ❤️
                  </button>
                  <button className="flex-1 text-sm py-1 bg-orange-100 hover:bg-orange-200 rounded text-orange-600">
                    🍎
                  </button>
                  <button className="flex-1 text-sm py-1 bg-blue-100 hover:bg-blue-200 rounded text-blue-600">
                    👁️
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* 待处理请求 */}
        {pendingRequests.length > 0 && (
          <>
            <div className="p-4 border-t border-b bg-yellow-50">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <span>📨</span>
                <span>访问请求</span>
                <span className="text-sm bg-yellow-400 text-white px-2 rounded-full">
                  {pendingRequests.length}
                </span>
              </h3>
            </div>
            
            <div className="p-2 space-y-2">
              {pendingRequests.map((request) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white border-2 border-yellow-300 rounded-lg p-3"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-2xl">🐸</div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">
                        {request.guestFrog.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        想来做客
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => onAcceptVisit(request)}
                      className="flex-1 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium"
                    >
                      ✅ 接受
                    </button>
                    <button
                      onClick={() => onRejectVisit(request)}
                      className="flex-1 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-lg text-sm font-medium"
                    >
                      ❌ 拒绝
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {/* 今日来访 */}
        <div className="p-4 border-t">
          <button className="w-full flex items-center justify-between text-gray-600 hover:text-gray-800">
            <span className="flex items-center gap-2">
              <span>📜</span>
              <span className="text-sm">今日来访</span>
            </span>
            <span className="text-xs text-gray-400">点击展开</span>
          </button>
        </div>
      </div>
    </div>
  );
};
