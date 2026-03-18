import { useCallback, useEffect, useState } from 'react';

export type LongTermGoalCategory = 'care' | 'travel' | 'decoration';
export type LongTermGoalId = 'care_streak' | 'travel_collection' | 'decoration_set';

export interface LongTermRewardItem {
  itemId: string;
  quantity: number;
}

export interface LongTermGoalReward {
  exp: number;
  items: LongTermRewardItem[];
}

export interface LongTermGoalView {
  id: LongTermGoalId;
  title: string;
  description: string;
  icon: string;
  category: LongTermGoalCategory;
  progress: number;
  target: number;
  completed: boolean;
  completedAt?: number;
  reward: LongTermGoalReward;
  highlight: string;
}

export interface LongTermMilestone {
  goalId: LongTermGoalId;
  title: string;
  message: string;
  reward: LongTermGoalReward;
}

interface LongTermGoalRecord {
  completedAt?: number;
  rewardGranted: boolean;
}

interface LongTermGoalState {
  careStreak: number;
  lastCareCompletionDay: string | null;
  goals: Record<LongTermGoalId, LongTermGoalRecord>;
  queue: LongTermMilestone[];
}

interface UseLongTermGoalsOptions {
  tasksCompleted: number;
  tasksTotal: number;
  travelHistory: Array<{ destination: string; completed: boolean }>;
  placedDecorationTypes: string[];
}

const STORAGE_KEY = 'zfrog_long_term_goals';

const goalDefinitions: Array<{
  id: LongTermGoalId;
  title: string;
  description: string;
  icon: string;
  category: LongTermGoalCategory;
  target: number;
  reward: LongTermGoalReward;
}> = [
  {
    id: 'care_streak',
    title: '照护连胜',
    description: '连续 3 天完成全部每日任务，养成稳定陪伴节奏。',
    icon: '🗓️',
    category: 'care',
    target: 3,
    reward: {
      exp: 60,
      items: [{ itemId: 'cake', quantity: 1 }],
    },
  },
  {
    id: 'travel_collection',
    title: '旅途收藏家',
    description: '完成 3 个不同目的地的旅行，把桌宠足迹铺开。',
    icon: '🧭',
    category: 'travel',
    target: 3,
    reward: {
      exp: 80,
      items: [{ itemId: 'gift_box', quantity: 1 }],
    },
  },
  {
    id: 'decoration_set',
    title: '家园策展人',
    description: '在家园中摆放 3 种不同装饰，凑齐第一套自然布置。',
    icon: '🏡',
    category: 'decoration',
    target: 3,
    reward: {
      exp: 50,
      items: [{ itemId: 'flower', quantity: 1 }],
    },
  },
];

function getDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getPreviousDayKey(dayKey: string) {
  const [year, month, day] = dayKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - 1);
  return getDayKey(date);
}

function getDefaultState(): LongTermGoalState {
  return {
    careStreak: 0,
    lastCareCompletionDay: null,
    goals: {
      care_streak: { rewardGranted: false },
      travel_collection: { rewardGranted: false },
      decoration_set: { rewardGranted: false },
    },
    queue: [],
  };
}

export function useLongTermGoals({
  tasksCompleted,
  tasksTotal,
  travelHistory,
  placedDecorationTypes,
}: UseLongTermGoalsOptions) {
  const [state, setState] = useState<LongTermGoalState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return getDefaultState();
      return {
        ...getDefaultState(),
        ...JSON.parse(raw),
      };
    } catch {
      return getDefaultState();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save long-term goals:', error);
    }
  }, [state]);

  useEffect(() => {
    if (tasksTotal === 0 || tasksCompleted !== tasksTotal) return;

    const todayKey = getDayKey();

    setState(prev => {
      if (prev.lastCareCompletionDay === todayKey) return prev;

      const isConsecutive = prev.lastCareCompletionDay === getPreviousDayKey(todayKey);
      return {
        ...prev,
        careStreak: isConsecutive ? prev.careStreak + 1 : 1,
        lastCareCompletionDay: todayKey,
      };
    });
  }, [tasksCompleted, tasksTotal]);

  const uniqueTravelDestinations = Array.from(
    new Set(
      travelHistory
        .filter(entry => entry.completed)
        .map(entry => entry.destination)
    )
  );
  const uniquePlacedDecorationTypes = Array.from(new Set(placedDecorationTypes));

  useEffect(() => {
    const progressByGoal: Record<LongTermGoalId, number> = {
      care_streak: state.careStreak,
      travel_collection: uniqueTravelDestinations.length,
      decoration_set: uniquePlacedDecorationTypes.length,
    };

    setState(prev => {
      let changed = false;
      const nextGoals = { ...prev.goals };
      const nextQueue = [...prev.queue];

      for (const definition of goalDefinitions) {
        const progress = progressByGoal[definition.id];
        const alreadyCompleted = Boolean(prev.goals[definition.id]?.completedAt);

        if (progress >= definition.target && !alreadyCompleted) {
          changed = true;
          nextGoals[definition.id] = {
            ...prev.goals[definition.id],
            completedAt: Date.now(),
            rewardGranted: false,
          };
          nextQueue.push({
            goalId: definition.id,
            title: definition.title,
            message: `${definition.icon} ${definition.title} 达成，长期养成奖励已送到背包。`,
            reward: definition.reward,
          });
        }
      }

      if (!changed) return prev;
      return {
        ...prev,
        goals: nextGoals,
        queue: nextQueue,
      };
    });
  }, [state.careStreak, uniqueTravelDestinations.length, uniquePlacedDecorationTypes.length]);

  const acknowledgeMilestone = useCallback((goalId: LongTermGoalId) => {
    setState(prev => ({
      ...prev,
      goals: {
        ...prev.goals,
        [goalId]: {
          ...prev.goals[goalId],
          rewardGranted: true,
        },
      },
      queue: prev.queue.filter(item => item.goalId !== goalId),
    }));
  }, []);

  const completedGoalCount = goalDefinitions.filter(definition => Boolean(state.goals[definition.id]?.completedAt)).length;

  const goals: LongTermGoalView[] = goalDefinitions.map(definition => {
    const completedAt = state.goals[definition.id]?.completedAt;
    const rawProgress =
      definition.id === 'care_streak'
        ? state.careStreak
        : definition.id === 'travel_collection'
          ? uniqueTravelDestinations.length
          : uniquePlacedDecorationTypes.length;

    let highlight = '';
    if (definition.id === 'care_streak') {
      highlight = `当前照护连胜 ${Math.min(rawProgress, definition.target)} / ${definition.target} 天`;
    } else if (definition.id === 'travel_collection') {
      highlight = `已解锁 ${Math.min(rawProgress, definition.target)} / ${definition.target} 个旅行足迹`;
    } else {
      highlight = `已摆放 ${Math.min(rawProgress, definition.target)} / ${definition.target} 种装饰`;
    }

    return {
      ...definition,
      progress: Math.min(rawProgress, definition.target),
      completed: Boolean(completedAt),
      completedAt,
      highlight,
    };
  });

  const nextTip = (() => {
    const careGoal = goals.find(goal => goal.id === 'care_streak');
    const travelGoal = goals.find(goal => goal.id === 'travel_collection');
    const decorationGoal = goals.find(goal => goal.id === 'decoration_set');

    if (careGoal && !careGoal.completed) {
      const remainingTasks = Math.max(0, tasksTotal - tasksCompleted);
      if (tasksTotal > 0 && remainingTasks > 0) {
        return `今天再完成 ${remainingTasks} 项每日任务，就能把照护连胜继续往前推。`;
      }
      return '连续完成每日任务会累积照护连胜，是最稳的长期成长来源。';
    }

    if (travelGoal && !travelGoal.completed) {
      const remaining = Math.max(0, travelGoal.target - travelGoal.progress);
      return `再去 ${remaining} 个新地点旅行，就能解锁旅途收藏家的长期奖励。`;
    }

    if (decorationGoal && !decorationGoal.completed) {
      const remaining = Math.max(0, decorationGoal.target - decorationGoal.progress);
      return `去家园再摆上 ${remaining} 种不同装饰，就能凑齐第一套自然布置。`;
    }

    return '长期目标都完成了，继续旅行、布置家园和保持照护节奏吧。';
  })();

  return {
    goals,
    nextTip,
    pendingMilestone: state.queue[0] ?? null,
    careStreak: state.careStreak,
    completedGoalCount,
    uniqueTravelDestinations,
    uniquePlacedDecorationTypes,
    acknowledgeMilestone,
  };
}
