/**
 * 🐸 宠物蛋系统 - 旅行前置检查组件
 * 模块D: 旅行系统增强
 * 功能: 检查状态是否满足旅行条件，展示警告，确认旅行
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFrogNurture, useFrogNurtureActions, NURTURE_STATUS_CONFIG } from '../../hooks/useFrogNurture';

interface TravelCheckProps {
  frogId: number;
  frogName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// SVG 图标
const Icons = {
  Check: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  Warning: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
    </svg>
  ),
  X: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
  Plane: () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
    </svg>
  ),
};

// Claymorphism 样式
const clayStyles = {
  card: `
    bg-gradient-to-br from-white to-gray-50
    rounded-3xl
    shadow-[8px_8px_16px_rgba(163,177,198,0.6),-8px_-8px_16px_rgba(255,255,255,0.8)]
    border border-white/50
  `,
  button: `
    rounded-2xl
    shadow-[4px_4px_8px_rgba(163,177,198,0.5),-4px_-4px_8px_rgba(255,255,255,0.8)]
    hover:shadow-[2px_2px_4px_rgba(163,177,198,0.5),-2px_-2px_4px_rgba(255,255,255,0.8)]
    active:shadow-inner
    transition-all duration-200 ease-out
    cursor-pointer
  `,
};

// 状态项组件
function StatusCheckItem({
  label,
  value,
  required,
  icon,
}: {
  label: string;
  value: number;
  required: number;
  icon: string;
}) {
  const isPassing = value >= required;
  
  return (
    <div className={`
      flex items-center gap-3 p-3 rounded-xl
      ${isPassing ? 'bg-green-50' : 'bg-red-50'}
    `}>
      <span className="text-xl">{icon}</span>
      <div className="flex-1">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className={`text-sm font-bold ${isPassing ? 'text-green-600' : 'text-red-500'}`}>
            {Math.round(value)} / {required}
          </span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${isPassing ? 'bg-green-500' : 'bg-red-400'}`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (value / required) * 100)}%` }}
          />
        </div>
      </div>
      <div className={isPassing ? 'text-green-500' : 'text-red-500'}>
        {isPassing ? <Icons.Check /> : <Icons.X />}
      </div>
    </div>
  );
}

export function TravelCheck({ frogId, frogName, onConfirm, onCancel }: TravelCheckProps) {
  const { status, loading } = useFrogNurture(frogId);
  const { checkTravelRequirements } = useFrogNurtureActions(frogId);
  const [requirements, setRequirements] = useState<{
    canTravel: boolean;
    failedRequirements: string[];
    warnings: string[];
  } | null>(null);
  const [checkLoading, setCheckLoading] = useState(true);

  // 获取旅行要求
  useEffect(() => {
    const check = async () => {
      setCheckLoading(true);
      try {
        const result = await checkTravelRequirements();
        if (result) {
          setRequirements(result);
        }
      } catch (err) {
        console.error('检查旅行条件失败:', err);
      } finally {
        setCheckLoading(false);
      }
    };
    check();
  }, [frogId]);

  // 旅行最低状态要求
  const travelRequirements = {
    hunger: 30,
    happiness: 20,
    health: 40,
    energy: 20,
    cleanliness: 30,
  };

  const checkStatus = () => {
    if (!status) return { allPassing: false, passingCount: 0, totalCount: 5 };
    
    let passingCount = 0;
    const checks = [
      { key: 'hunger', value: status.hunger, required: travelRequirements.hunger },
      { key: 'happiness', value: status.happiness, required: travelRequirements.happiness },
      { key: 'health', value: status.health, required: travelRequirements.health },
      { key: 'energy', value: status.energy, required: travelRequirements.energy },
      { key: 'cleanliness', value: status.cleanliness, required: travelRequirements.cleanliness },
    ];

    checks.forEach(c => {
      if (c.value >= c.required) passingCount++;
    });

    return { allPassing: passingCount === 5, passingCount, totalCount: 5 };
  };

  const { allPassing, passingCount, totalCount } = checkStatus();

  if (loading || checkLoading) {
    return (
      <div className={`${clayStyles.card} p-6`}>
        <div className="flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-green-500 rounded-full animate-spin" />
          <span className="text-gray-600">检查旅行条件...</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className={clayStyles.card}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="p-6">
        {/* 标题 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white shadow-lg">
            <Icons.Plane />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">旅行前检查</h3>
            <p className="text-sm text-gray-500">确保 {frogName} 状态良好再出发</p>
          </div>
        </div>

        {/* 状态检查列表 */}
        {status && (
          <div className="space-y-2 mb-4">
            <StatusCheckItem
              label={NURTURE_STATUS_CONFIG.hunger.label}
              value={status.hunger}
              required={travelRequirements.hunger}
              icon={NURTURE_STATUS_CONFIG.hunger.icon}
            />
            <StatusCheckItem
              label={NURTURE_STATUS_CONFIG.happiness.label}
              value={status.happiness}
              required={travelRequirements.happiness}
              icon={NURTURE_STATUS_CONFIG.happiness.icon}
            />
            <StatusCheckItem
              label={NURTURE_STATUS_CONFIG.health.label}
              value={status.health}
              required={travelRequirements.health}
              icon={NURTURE_STATUS_CONFIG.health.icon}
            />
            <StatusCheckItem
              label={NURTURE_STATUS_CONFIG.energy.label}
              value={status.energy}
              required={travelRequirements.energy}
              icon={NURTURE_STATUS_CONFIG.energy.icon}
            />
            <StatusCheckItem
              label={NURTURE_STATUS_CONFIG.cleanliness.label}
              value={status.cleanliness}
              required={travelRequirements.cleanliness}
              icon={NURTURE_STATUS_CONFIG.cleanliness.icon}
            />
          </div>
        )}

        {/* 检查结果 */}
        <div className={`
          p-3 rounded-xl mb-4
          ${allPassing ? 'bg-green-50' : 'bg-orange-50'}
        `}>
          <div className="flex items-center gap-2">
            {allPassing ? (
              <>
                <span className="text-green-500"><Icons.Check /></span>
                <span className="font-medium text-green-700">
                  状态良好！{frogName} 准备好出发了
                </span>
              </>
            ) : (
              <>
                <span className="text-orange-500"><Icons.Warning /></span>
                <span className="font-medium text-orange-700">
                  {passingCount}/{totalCount} 项通过，建议先照顾好 {frogName}
                </span>
              </>
            )}
          </div>
        </div>

        {/* 生病/需要清洁警告 */}
        {status && (status.isSick || status.needsClean) && (
          <div className="p-3 rounded-xl bg-red-50 mb-4">
            <div className="flex items-center gap-2 text-red-700">
              <Icons.Warning />
              <span className="font-medium">
                {status.isSick && '青蛙生病了！'}
                {status.isSick && status.needsClean && ' '}
                {status.needsClean && '需要清洁！'}
              </span>
            </div>
            <p className="text-sm text-red-600 mt-1">
              建议先处理这些问题再出发旅行
            </p>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onCancel}
            className={`
              flex-1 py-3 rounded-xl font-medium
              bg-gray-100 text-gray-600 hover:bg-gray-200
              transition-colors
            `}
          >
            返回
          </motion.button>
          
          <motion.button
            whileHover={{ scale: allPassing ? 1.02 : 1 }}
            whileTap={{ scale: allPassing ? 0.98 : 1 }}
            onClick={onConfirm}
            disabled={!allPassing || status?.isSick}
            className={`
              flex-1 py-3 rounded-xl font-bold
              ${allPassing && !status?.isSick
                ? `${clayStyles.button} bg-gradient-to-br from-blue-400 to-cyan-500 text-white`
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            确认出发
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

export default TravelCheck;
