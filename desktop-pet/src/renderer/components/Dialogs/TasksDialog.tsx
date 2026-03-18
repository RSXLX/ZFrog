import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LongTermGoalPanel from '../LongTermGoalPanel';
import type { LongTermGoalView } from '../../hooks/useLongTermGoals';

interface DailyTask {
  id: string;
  title: string;
  description: string;
  reward: number;
  completed: boolean;
  type: 'feed' | 'pet' | 'patrol' | 'social' | 'explore';
}

interface TasksDialogProps {
  walletAddress: string;
  visible: boolean;
  onClose: () => void;
  tasks?: DailyTask[];
  totalReward?: number;
  longTermGoals?: LongTermGoalView[];
  nextTip?: string;
}

const TasksDialog: React.FC<TasksDialogProps> = ({
  walletAddress,
  visible,
  onClose,
  tasks = [],
  totalReward = 0,
  longTermGoals = [],
  nextTip,
}) => {
  const getProgress = () => {
    const completed = tasks.filter(t => t.completed).length;
    return { completed, total: tasks.length };
  };

  const progress = getProgress();

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="dialog-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="dialog-content"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            style={{ position: 'relative' }}
          >
            <button className="dialog-close" onClick={onClose}>×</button>
            
            <h2 className="dialog-title">📋 每日任务</h2>
            
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#888', marginBottom: 4 }}>
                <span>进度: {progress.completed}/{progress.total}</span>
                <span>今日奖励: +{totalReward}</span>
              </div>
              <div style={{ height: 8, background: '#eee', borderRadius: 4, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%` }}
                  style={{ height: '100%', background: 'linear-gradient(90deg, #4ADE80, #22C55E)' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tasks.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#888', padding: 20 }}>
                  <p>暂无任务</p>
                </div>
              ) : (
                tasks.map(task => (
                  <div
                    key={task.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 12,
                      background: task.completed ? '#f0fdf4' : 'white',
                      borderRadius: 8,
                      border: `1px solid ${task.completed ? '#86efac' : '#e5e7eb'}`,
                    }}
                  >
                    <span style={{ fontSize: 24 }}>
                      {task.type === 'feed' && '🍎'}
                      {task.type === 'pet' && '👋'}
                      {task.type === 'patrol' && '🎯'}
                      {task.type === 'social' && '👥'}
                      {task.type === 'explore' && '✈️'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{task.title}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>{task.description}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#22c55e' }}>+{task.reward}</div>
                      {task.completed && <div style={{ fontSize: 12, color: '#22c55e' }}>✅</div>}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div
              style={{
                marginTop: 18,
                paddingTop: 16,
                borderTop: '1px solid #e5e7eb',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>
                长期目标
              </div>
              <LongTermGoalPanel goals={longTermGoals} nextTip={nextTip} compact />
            </div>

            <div style={{ marginTop: 14, fontSize: 11, color: '#94a3b8' }}>
              当前钱包：{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TasksDialog;
