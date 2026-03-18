import React from 'react';
import { motion } from 'framer-motion';
import type { LongTermGoalView } from '../hooks/useLongTermGoals';

interface LongTermGoalPanelProps {
  goals: LongTermGoalView[];
  nextTip?: string;
  compact?: boolean;
}

const categoryLabels: Record<LongTermGoalView['category'], string> = {
  care: '照护',
  travel: '旅行',
  decoration: '家园',
};

const categoryColors: Record<LongTermGoalView['category'], string> = {
  care: '#22c55e',
  travel: '#0ea5e9',
  decoration: '#f59e0b',
};

const rewardItemLabels: Record<string, string> = {
  cake: '蛋糕',
  gift_box: '礼盒',
  flower: '花朵',
};

const rewardText = (goal: LongTermGoalView) => {
  const itemText = goal.reward.items
    .map(item => `${item.quantity}x ${rewardItemLabels[item.itemId] || item.itemId}`)
    .join('、');
  return [`${goal.reward.exp} EXP`, itemText].filter(Boolean).join(' + ');
};

const LongTermGoalPanel: React.FC<LongTermGoalPanelProps> = ({ goals, nextTip, compact = false }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? 10 : 12,
      }}
    >
      {goals.map((goal, index) => (
        <motion.div
          key={goal.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04 }}
          style={{
            borderRadius: 12,
            padding: compact ? 10 : 12,
            background: goal.completed ? '#f0fdf4' : '#f8fafc',
            border: `1px solid ${goal.completed ? '#86efac' : '#e2e8f0'}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: compact ? 18 : 22 }}>{goal.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: compact ? 13 : 14, color: '#0f172a' }}>{goal.title}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{goal.description}</div>
              </div>
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '4px 8px',
                borderRadius: 999,
                color: categoryColors[goal.category],
                background: `${categoryColors[goal.category]}14`,
              }}
            >
              {categoryLabels[goal.category]}
            </span>
          </div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#475569', marginBottom: 4 }}>
              <span>{goal.highlight}</span>
              <span>{goal.progress}/{goal.target}</span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${(goal.progress / goal.target) * 100}%`,
                  background: goal.completed
                    ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                    : `linear-gradient(90deg, ${categoryColors[goal.category]}, ${categoryColors[goal.category]}aa)`,
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 11 }}>
            <span style={{ color: '#475569' }}>奖励：{rewardText(goal)}</span>
            <span style={{ color: goal.completed ? '#16a34a' : '#64748b', fontWeight: 700 }}>
              {goal.completed ? '已达成' : '进行中'}
            </span>
          </div>
        </motion.div>
      ))}

      {nextTip ? (
        <div
          style={{
            padding: compact ? 10 : 12,
            borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(14,165,233,0.12), rgba(34,197,94,0.12))',
            border: '1px solid rgba(14,165,233,0.18)',
            fontSize: 12,
            color: '#0f172a',
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>回流提示</div>
          <div>{nextTip}</div>
        </div>
      ) : null}
    </div>
  );
};

export default LongTermGoalPanel;
