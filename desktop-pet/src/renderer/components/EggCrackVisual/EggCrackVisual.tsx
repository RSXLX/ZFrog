/**
 * EggCrackVisual - 蛋壳裂纹可视化组件
 * Phase 1 功能：蛋壳裂纹可视化
 * 
 * 功能：
 * - 根据 crackPatterns 渲染 SVG 裂纹
 * - 动态裂纹生长动画
 * - 裂纹深度和分支可视化
 * - 与孵化进度联动
 */

import React, { useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './EggCrackVisual.css';

// ==================== 类型定义 ====================

export interface CrackPoint {
  x: number; // 0-1
  y: number; // 0-1
}

export interface CrackBranch {
  points: CrackPoint[];
  width: number;
  depth: number;
}

export interface CrackPattern {
  id: string;
  position: { x: number; y: number };
  size: number;
  depth: number;
  branches: number;
  mainCrack?: CrackBranch;
  subCracks?: CrackBranch[];
}

export interface EggCrackVisualProps {
  patterns: CrackPattern[];
  progress: number; // 0-100
  intensity: number; // 0-1 裂纹强度
  eggSize?: number; // 蛋壳大小 px
  animated?: boolean;
  glowEffect?: boolean;
  className?: string;
}

// ==================== 辅助函数 ====================

/**
 * 生成裂纹路径
 */
const generateCrackPath = (
  start: CrackPoint,
  length: number,
  angle: number,
  roughness: number = 0.3
): CrackPoint[] => {
  const points: CrackPoint[] = [start];
  const segments = Math.max(3, Math.floor(length * 10));
  
  let currentAngle = angle;
  let currentX = start.x;
  let currentY = start.y;
  
  const stepSize = length / segments;
  
  for (let i = 1; i <= segments; i++) {
    // 随机改变角度
    const angleVariation = (Math.random() - 0.5) * roughness * Math.PI;
    currentAngle += angleVariation;
    
    // 计算新位置
    currentX += Math.cos(currentAngle) * stepSize;
    currentY += Math.sin(currentAngle) * stepSize;
    
    // 添加随机抖动
    const jitter = stepSize * 0.2;
    currentX += (Math.random() - 0.5) * jitter;
    currentY += (Math.random() - 0.5) * jitter;
    
    points.push({ x: currentX, y: currentY });
  }
  
  return points;
};

/**
 * 将点数组转换为 SVG 路径
 */
const pointsToPath = (points: CrackPoint[]): string => {
  if (points.length < 2) return '';
  
  let path = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 1; i < points.length; i++) {
    // 使用二次贝塞尔曲线使裂纹更自然
    if (i < points.length - 1) {
      const cpX = (points[i].x + points[i + 1].x) / 2;
      const cpY = (points[i].y + points[i + 1].y) / 2;
      path += ` Q ${points[i].x} ${points[i].y} ${cpX} ${cpY}`;
      i++;
    } else {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
  }
  
  return path;
};

// ==================== 组件 ====================

export const EggCrackVisual: React.FC<EggCrackVisualProps> = ({
  patterns,
  progress,
  intensity,
  eggSize = 200,
  animated = true,
  glowEffect = true,
  className = '',
}) => {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // 生成裂纹 SVG 元素
  const crackElements = useMemo(() => {
    return patterns.map((pattern, index) => {
      const { position, size, depth, branches } = pattern;
      
      // 计算实际像素位置
      const centerX = eggSize / 2;
      const centerY = eggSize / 2;
      const radius = eggSize / 2 - 10;
      
      // 主裂纹起点
      const startX = centerX + (position.x - 0.5) * radius * 2;
      const startY = centerY + (position.y - 0.5) * radius * 2;
      
      // 生成主裂纹
      const mainAngle = Math.random() * Math.PI * 2;
      const mainLength = size * radius * intensity;
      const mainPoints = generateCrackPath(
        { x: startX, y: startY },
        mainLength,
        mainAngle,
        0.4 + depth * 0.3
      );
      
      // 生成分支裂纹
      const branchElements: React.ReactNode[] = [];
      
      for (let i = 0; i < branches; i++) {
        const branchIndex = Math.floor(Math.random() * (mainPoints.length - 2)) + 1;
        const branchStart = mainPoints[branchIndex];
        const branchAngle = mainAngle + (Math.random() - 0.5) * Math.PI;
        const branchLength = mainLength * (0.3 + Math.random() * 0.4);
        
        const branchPoints = generateCrackPath(
          branchStart,
          branchLength,
          branchAngle,
          0.5
        );
        
        branchElements.push(
          <motion.path
            key={`branch-${pattern.id}-${i}`}
            d={pointsToPath(branchPoints)}
            stroke={`rgba(30, 30, 30, ${0.3 + depth * 0.4})`}
            strokeWidth={0.5 + depth * 0.5}
            fill="none"
            initial={animated ? { pathLength: 0, opacity: 0 } : false}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
              pathLength: { duration: 0.5 + i * 0.1, ease: "easeOut" },
              opacity: { duration: 0.2 },
            }}
          />
        );
      }

      return (
        <g key={`crack-${pattern.id}`} className="crack-pattern">
          {/* 主裂纹 */}
          <motion.path
            d={pointsToPath(mainPoints)}
            stroke={`rgba(20, 20, 20, ${0.6 + depth * 0.3})`}
            strokeWidth={1 + depth * 2}
            fill="none"
            strokeLinecap="round"
            initial={animated ? { pathLength: 0, opacity: 0 } : false}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
              pathLength: { duration: 0.8, ease: "easeOut" },
              opacity: { duration: 0.3 },
            }}
          />
          
          {/* 分支裂纹 */}
          {branchElements}
          
          {/* 裂纹发光效果 */}
          {glowEffect && depth > 0.5 && (
            <motion.ellipse
              cx={startX}
              cy={startY}
              rx={size * 20}
              ry={size * 15}
              fill={`rgba(255, 200, 100, ${0.1 + depth * 0.1})`}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse' }}
            />
          )}
        </g>
      );
    });
  }, [patterns, eggSize, intensity, animated, glowEffect]);

  // 蛋壳基础样式
  const eggStyle: React.CSSProperties = {
    width: eggSize,
    height: eggSize * 1.25,
    position: 'relative',
  };

  return (
    <div className={`egg-crack-visual ${className}`} style={eggStyle}>
      {/* 蛋壳背景 */}
      <svg
        width={eggSize}
        height={eggSize * 1.25}
        viewBox={`0 0 ${eggSize} ${eggSize * 1.25}`}
        className="egg-svg"
      >
        <defs>
          {/* 蛋壳渐变 */}
          <radialGradient id="eggGradient" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#f5f0e6" />
            <stop offset="60%" stopColor="#e8dcc6" />
            <stop offset="100%" stopColor="#d4c4a8" />
          </radialGradient>
          
          {/* 裂纹阴影滤镜 */}
          <filter id="crackShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="1" dy="1" stdDeviation="1" floodColor="rgba(0,0,0,0.3)" />
          </filter>
        </defs>
        
        {/* 蛋壳主体 */}
        <motion.ellipse
          cx={eggSize / 2}
          cy={eggSize * 0.625}
          rx={eggSize / 2 - 5}
          ry={eggSize * 0.625 - 5}
          fill="url(#eggGradient)"
          stroke="#c9b896"
          strokeWidth={2}
          initial={mounted ? { scale: 0.8, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        
        {/* 高光效果 */}
        <ellipse
          cx={eggSize * 0.35}
          cy={eggSize * 0.4}
          rx={eggSize * 0.15}
          ry={eggSize * 0.1}
          fill="rgba(255,255,255,0.4)"
        />
        
        {/* 裂纹层 */}
        <g filter="url(#crackShadow)">
          {mounted && crackElements}
        </g>
        
        {/* 孵化进度指示 */}
        {progress > 0 && (
          <g transform={`translate(${eggSize / 2}, ${eggSize * 0.9})`}>
            <rect
              x={-40}
              y={0}
              width={80}
              height={6}
              rx={3}
              fill="rgba(0,0,0,0.2)"
            />
            <motion.rect
              x={-40}
              y={0}
              width={80 * (progress / 100)}
              height={6}
              rx={3}
              fill="#4ade80"
              initial={{ width: 0 }}
              animate={{ width: 80 * (progress / 100) }}
              transition={{ duration: 0.3 }}
            />
            <text
              x={0}
              y={20}
              textAnchor="middle"
              fontSize={12}
              fill="#666"
            >
              {Math.round(progress)}%
            </text>
          </g>
        )}
      </svg>
      
      {/* 裂纹音效层 - 视觉反馈 */}
      <AnimatePresence>
        {intensity > 0.7 && (
          <motion.div
            className="crack-glow"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: [0, 0.3, 0],
              scale: [0.9, 1.1, 1.2]
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              repeatType: 'loop'
            }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: eggSize,
              height: eggSize * 1.25,
              background: 'radial-gradient(ellipse at center, rgba(255,200,100,0.3) 0%, transparent 70%)',
              borderRadius: '50%',
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default EggCrackVisual;
