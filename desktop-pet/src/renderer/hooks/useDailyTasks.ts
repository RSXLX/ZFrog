import { useState, useEffect, useCallback } from 'react';

interface DailyTask {
  id: string;
  title: string;
  description: string;
  reward: number;
  completed: boolean;
  type: 'feed' | 'pet' | 'patrol' | 'social' | 'explore';
}

const defaultTasks: DailyTask[] = [
  { id: '1', title: '喂食', description: '给青蛙喂3次食物', reward: 20, completed: false, type: 'feed' },
  { id: '2', title: '抚摸', description: '抚摸青蛙5次', reward: 15, completed: false, type: 'pet' },
  { id: '3', title: '巡逻', description: '完成一次桌面巡逻', reward: 25, completed: false, type: 'patrol' },
  { id: '4', title: '外出', description: '让青蛙外出旅行一次', reward: 30, completed: false, type: 'explore' },
  { id: '5', title: '社交', description: '查看一次好友列表', reward: 10, completed: false, type: 'social' },
];

export function useDailyTasks() {
  const [tasks, setTasks] = useState<DailyTask[]>(defaultTasks);

  // Load from storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('zfrog_tasks');
      const savedDate = localStorage.getItem('zfrog_tasks_date');
      if (saved && savedDate) {
        const today = new Date().toDateString();
        if (savedDate === today) {
          setTasks(JSON.parse(saved));
        } else {
          // Reset tasks for new day
          resetTasks();
        }
      }
    } catch (e) {
      console.warn('Failed to load tasks:', e);
    }
  }, []);

  // Save to storage
  useEffect(() => {
    try {
      localStorage.setItem('zfrog_tasks', JSON.stringify(tasks));
      localStorage.setItem('zfrog_tasks_date', new Date().toDateString());
    } catch (e) {
      console.warn('Failed to save tasks:', e);
    }
  }, [tasks]);

  const resetTasks = useCallback(() => {
    setTasks(defaultTasks);
  }, []);

  const completeTask = useCallback((taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, completed: true } : task
    ));
  }, []);

  const getProgress = useCallback(() => {
    const completed = tasks.filter(t => t.completed).length;
    return { completed, total: tasks.length, percentage: Math.round((completed / tasks.length) * 100) };
  }, [tasks]);

  const getTotalReward = useCallback(() => {
    return tasks.filter(t => t.completed).reduce((sum, t) => sum + t.reward, 0);
  }, [tasks]);

  return { tasks, completeTask, getProgress, getTotalReward, resetTasks };
}
