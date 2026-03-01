import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';

interface Task {
  id: string;
  name: string;
  description: string;
  icon: string;
  progress: number;
  target: number;
  completed: boolean;
  claimed: boolean;
  reward: { lily?: number; xp?: number };
}

interface TasksDialogProps {
  walletAddress: string;
  visible: boolean;
  onClose: () => void;
}

const TasksDialog: React.FC<TasksDialogProps> = ({ walletAddress, visible, onClose }) => {
  const [tasks, setTasks] = useState<{ daily: Task[]; weekly: Task[] }>({ daily: [], weekly: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && walletAddress) {
      loadTasks();
    }
  }, [visible, walletAddress]);

  const loadTasks = async () => {
    setLoading(true);
    const data = await api.getTasks(walletAddress);
    if (data) {
      setTasks(data);
    }
    setLoading(false);
  };

  const handleClaim = async (taskId: string) => {
    const success = await api.claimTaskReward(walletAddress, taskId);
    if (success) {
      loadTasks();
    }
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="dialog-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}
      >
        <motion.div
          className="dialog-content"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'white',
            borderRadius: 16,
            padding: 20,
            width: 320,
            maxHeight: '80vh',
            overflow: 'auto',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, color: '#11998e' }}>📋 每日任务</h2>
            <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 20 }}>加载中...</div>
          ) : (
            <>
              <h3 style={{ fontSize: 14, color: '#666', marginBottom: 10 }}>每日任务</h3>
              {tasks.daily.map((task) => (
                <div
                  key={task.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: 12,
                    marginBottom: 8,
                    background: task.completed ? '#f0fdf4' : '#f8f9fa',
                    borderRadius: 8,
                    border: task.completed ? '1px solid #22c55e' : '1px solid #e5e7eb',
                  }}
                >
                  <span style={{ fontSize: 24, marginRight: 12 }}>{task.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: 14 }}>{task.name}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>{task.description}</div>
                    <div style={{ fontSize: 11, color: '#999' }}>
                      {task.progress}/{task.target} • 奖励: {task.reward.lily} 💰
                    </div>
                  </div>
                  {task.completed && !task.claimed && (
                    <button
                      onClick={() => handleClaim(task.id)}
                      style={{
                        background: '#22c55e',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: 12,
                      }}
                    >
                      领取
                    </button>
                  )}
                  {task.claimed && (
                    <span style={{ color: '#22c55e', fontSize: 12 }}>✓ 已领取</span>
                  )}
                </div>
              ))}

              {tasks.weekly.length > 0 && (
                <>
                  <h3 style={{ fontSize: 14, color: '#666', marginTop: 20, marginBottom: 10 }}>每周任务</h3>
                  {tasks.weekly.map((task) => (
                    <div
                      key={task.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: 12,
                        marginBottom: 8,
                        background: task.completed ? '#f0fdf4' : '#f8f9fa',
                        borderRadius: 8,
                      }}
                    >
                      <span style={{ fontSize: 24, marginRight: 12 }}>{task.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold' }}>{task.name}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>{task.description}</div>
                      </div>
                      {task.completed && !task.claimed && (
                        <button
                          onClick={() => handleClaim(task.id)}
                          style={{
                            background: '#22c55e',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: 6,
                            cursor: 'pointer',
                          }}
                        >
                          领取
                        </button>
                      )}
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TasksDialog;
