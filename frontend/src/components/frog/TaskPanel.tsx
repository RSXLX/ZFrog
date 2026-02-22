/**
 * 🐸 宠物蛋系统 - 每日/周任务面板
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../../services/api';

interface TaskReward {
  lily?: number;
  xp?: number;
  zeta?: number;
  item?: string;
}

interface Task {
  id: string;
  name: string;
  description: string;
  icon: string;
  progress: number;
  target: number;
  completed: boolean;
  claimed: boolean;
  reward: TaskReward;
}

interface TaskPanelProps {
  ownerAddress: string;
}

type TabType = 'daily' | 'weekly';

export function TaskPanel({ ownerAddress }: TaskPanelProps) {
  const [dailyTasks, setDailyTasks] = useState<Task[]>([]);
  const [weeklyTasks, setWeeklyTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('daily');
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 获取任务列表
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response: any = await apiService.get(`/tasks/${ownerAddress}`);
      if (response.success) {
        setDailyTasks(response.data?.daily || []);
        setWeeklyTasks(response.data?.weekly || []);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setError('加载任务失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ownerAddress) {
      fetchTasks();
    }
  }, [ownerAddress]);

  // 领取奖励
  const claimReward = async (taskId: string) => {
    try {
      setClaiming(taskId);
      const response: any = await apiService.post(`/tasks/${ownerAddress}/claim`, { taskId });
      if (response.success) {
        // 刷新任务列表
        await fetchTasks();
      }
    } catch (err) {
      console.error('Failed to claim reward:', err);
    } finally {
      setClaiming(null);
    }
  };

  const tasks = activeTab === 'daily' ? dailyTasks : weeklyTasks;
  const completedCount = tasks.filter(t => t.completed).length;

  // 获取重置时间提示
  const getResetHint = () => {
    const now = new Date();
    if (activeTab === 'daily') {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const hours = Math.floor((tomorrow.getTime() - now.getTime()) / (1000 * 60 * 60));
      return `${hours}小时后重置`;
    } else {
      // 周任务：下周一重置
      const dayOfWeek = now.getDay();
      const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
      return `${daysUntilMonday}天后重置`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-green-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 text-red-700 p-4 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab 切换 */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
        <button
          onClick={() => setActiveTab('daily')}
          className={`
            flex-1 py-2.5 rounded-lg font-medium text-sm transition-all
            ${activeTab === 'daily'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
            }
          `}
        >
          📅 每日任务
          {dailyTasks.filter(t => t.completed && !t.claimed).length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
              {dailyTasks.filter(t => t.completed && !t.claimed).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('weekly')}
          className={`
            flex-1 py-2.5 rounded-lg font-medium text-sm transition-all
            ${activeTab === 'weekly'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
            }
          `}
        >
          📆 周常任务
          {weeklyTasks.filter(t => t.completed && !t.claimed).length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
              {weeklyTasks.filter(t => t.completed && !t.claimed).length}
            </span>
          )}
        </button>
      </div>

      {/* 标题 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          {activeTab === 'daily' ? '📋 每日任务' : '📆 周常任务'}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {completedCount}/{tasks.length} 已完成
          </span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
            ⏰ {getResetHint()}
          </span>
        </div>
      </div>

      {/* 任务列表 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-3"
        >
          {tasks.map((task) => (
            <motion.div
              key={task.id}
              layout
              className={`
                p-4 rounded-2xl transition-all duration-300
                ${task.completed 
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200' 
                  : 'bg-white border-2 border-gray-100 hover:border-gray-200'}
                shadow-[6px_6px_12px_#d1d1d1,-6px_-6px_12px_#ffffff]
              `}
            >
              <div className="flex items-center justify-between">
                {/* 任务信息 */}
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{task.icon}</span>
                  <div>
                    <div className="font-medium text-gray-800">{task.name}</div>
                    <div className="text-sm text-gray-500">{task.description}</div>
                  </div>
                </div>

                {/* 奖励/领取按钮 */}
                <div className="flex items-center gap-3">
                  {/* 奖励显示 */}
                  <div className="text-right">
                    {task.reward.lily && (
                      <div className="text-sm font-medium text-amber-600">
                        +{task.reward.lily} 🪷
                      </div>
                    )}
                    {task.reward.xp && (
                      <div className="text-xs text-purple-600">
                        +{task.reward.xp} XP
                      </div>
                    )}
                    {task.reward.zeta && (
                      <div className="text-xs text-blue-600">
                        +{task.reward.zeta} ZETA
                      </div>
                    )}
                    {task.reward.item && (
                      <div className="text-xs text-green-600">
                        🎁 {task.reward.item}
                      </div>
                    )}
                  </div>

                  {/* 状态/按钮 */}
                  {task.claimed ? (
                    <div className="px-4 py-2 rounded-xl bg-gray-100 text-gray-400 text-sm">
                      已领取 ✓
                    </div>
                  ) : task.completed ? (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => claimReward(task.id)}
                      disabled={claiming === task.id}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-400 to-emerald-500 
                               text-white font-medium text-sm hover:from-green-500 hover:to-emerald-600
                               transition-all duration-300 shadow-lg hover:shadow-xl
                               disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {claiming === task.id ? '领取中...' : '领取'}
                    </motion.button>
                  ) : (
                    <div className="text-sm text-gray-400">
                      {task.progress}/{task.target}
                    </div>
                  )}
                </div>
              </div>

              {/* 进度条 */}
              {!task.completed && (
                <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (task.progress / task.target) * 100)}%` }}
                    className={`h-full transition-all duration-500 ${
                      activeTab === 'daily'
                        ? 'bg-gradient-to-r from-blue-400 to-cyan-500'
                        : 'bg-gradient-to-r from-purple-400 to-pink-500'
                    }`}
                  />
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* 空状态 */}
      {tasks.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          暂无任务
        </div>
      )}

      {/* 全部完成提示 */}
      {tasks.length > 0 && completedCount === tasks.length && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl"
        >
          <span className="text-2xl">🎉</span>
          <span className="ml-2 text-green-600 font-medium">
            {activeTab === 'daily' ? '今日任务全部完成！' : '本周任务全部完成！'}
          </span>
        </motion.div>
      )}
    </div>
  );
}

export default TaskPanel;
