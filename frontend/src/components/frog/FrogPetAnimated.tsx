// frontend/src/components/frog/FrogPetAnimated.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFrogStatus } from '../../hooks/useFrogStatus';

// 青蛙状态枚举
export enum FrogState {
    IDLE = 'idle',
    WALKING = 'walking',
    SLEEPING = 'sleeping',
    EATING = 'eating',
    TRAVELING = 'traveling',
    HAPPY = 'happy'
}

interface FrogPetAnimatedProps {
    frogId?: number;
    frogName?: string;
    initialState?: FrogState;
    size?: number;
    interactive?: boolean;
}

// 动画变体
const frogVariants = {
    idle: {
        y: [0, -5, 0],
        transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
    },
    walking: {
        x: [0, 10, 20, 10, 0],
        y: [0, -8, 0, -8, 0],
        transition: { duration: 1, repeat: Infinity, ease: "linear" }
    },
    sleeping: {
        y: [0, -2, 0],
        rotate: [0, 5, 0],
        transition: { duration: 3, repeat: Infinity, ease: "easeInOut" }
    },
    traveling: {
        scale: [1, 0.9, 1],
        rotate: [-5, 5, -5],
        transition: { duration: 0.5, repeat: Infinity, ease: "easeInOut" }
    },
    happy: {
        y: [0, -15, 0],
        scale: [1, 1.1, 1],
        transition: { duration: 0.5, repeat: 3, ease: "easeOut" }
    },
    eating: {
        scale: [1, 1.05, 1],
        transition: { duration: 0.3, repeat: 5, ease: "easeInOut" }
    }
};

// 眼睛动画
const eyeVariants = {
    open: { scaleY: 1 },
    blink: {
        scaleY: [1, 0.1, 1],
        transition: { duration: 0.2 }
    },
    sleeping: { scaleY: 0.1 }
};

// 对话气泡组件
const SpeechBubble: React.FC<{ message: string; onComplete: () => void }> = ({ message, onComplete }) => {
    useEffect(() => {
        const timer = setTimeout(onComplete, 3000);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.8 }}
            className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-white rounded-xl px-4 py-2 shadow-lg text-sm whitespace-nowrap"
        >
            {message}
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-3 h-3 bg-white" />
        </motion.div>
    );
};

// Zzz 动画（睡觉时）
const SleepingZzz: React.FC = () => (
    <motion.div
        initial={{ opacity: 0, y: 0 }}
        animate={{ opacity: [0, 1, 0], y: -20 }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute -top-8 right-0 text-2xl"
    >
        💤
    </motion.div>
);

// 主组件 - 注意: frogId 参数用于 useFrogStatus hook
export const FrogPetAnimated: React.FC<FrogPetAnimatedProps> = ({
    frogId,
    frogName = "Froggy",
    initialState = FrogState.IDLE,
    size = 120,
    interactive = true
}) => {
    const [currentState, setCurrentState] = useState<FrogState>(initialState);
    const [message, setMessage] = useState<string | null>(null);
    const [eyeState, setEyeState] = useState<'open' | 'blink' | 'sleeping'>('open');

    // frogId 被传递给 useFrogStatus hook 使用
    const { status: chainStatus } = useFrogStatus(frogId);

    // 同步链上状态
    useEffect(() => {
        if (chainStatus === 'Traveling') {
            setCurrentState(FrogState.TRAVELING);
            setMessage("我在旅行中~ 🌍");
        } else if (chainStatus === 'Idle' && currentState === FrogState.TRAVELING) {
            setCurrentState(FrogState.HAPPY);
            setMessage("我回来啦！🎉");
            setTimeout(() => setCurrentState(FrogState.IDLE), 2000);
        }
    }, [chainStatus, currentState]);

    // 自动眨眼
    useEffect(() => {
        if (currentState === FrogState.SLEEPING) return;

        const blinkInterval = setInterval(() => {
            setEyeState('blink');
            setTimeout(() => setEyeState('open'), 200);
        }, 3000 + Math.random() * 2000);

        return () => clearInterval(blinkInterval);
    }, [currentState]);

    // 随机行为（仅在 Idle 状态）
    useEffect(() => {
        if (currentState !== FrogState.IDLE || !interactive) return;

        const behaviorInterval = setInterval(() => {
            const random = Math.random();

            if (random < 0.1) {
                // 10% 概率行走
                setCurrentState(FrogState.WALKING);
                setTimeout(() => setCurrentState(FrogState.IDLE), 3000);
            } else if (random < 0.15) {
                // 5% 概率打瞌睡
                setCurrentState(FrogState.SLEEPING);
                setEyeState('sleeping');
                setTimeout(() => {
                    setCurrentState(FrogState.IDLE);
                    setEyeState('open');
                }, 5000);
            }
        }, 5000);

        return () => clearInterval(behaviorInterval);
    }, [currentState, interactive]);

    // 随机自言自语
    useEffect(() => {
        if (currentState === FrogState.TRAVELING) return;

        const messages = [
            "今天天气真好~ ☀️",
            "想去探险...",
            "呱呱~ 🐸",
            "有点饿了...",
            `我是${frogName}！`,
            "ZetaChain 真棒！",
            "想念旅行的日子...",
            "区块链好神奇~"
        ];

        const messageInterval = setInterval(() => {
            if (Math.random() < 0.2 && !message) {
                setMessage(messages[Math.floor(Math.random() * messages.length)]);
            }
        }, 10000);

        return () => clearInterval(messageInterval);
    }, [frogName, currentState, message]);

    // 点击交互
    const handleClick = useCallback(() => {
        if (!interactive || currentState === FrogState.TRAVELING) return;

        setCurrentState(FrogState.HAPPY);
        setMessage("呱呱！你好呀~ 💚");

        setTimeout(() => {
            setCurrentState(FrogState.IDLE);
        }, 1500);
    }, [interactive, currentState]);

    // 喂食
    const handleFeed = useCallback(() => {
        if (!interactive || currentState === FrogState.TRAVELING) return;

        setCurrentState(FrogState.EATING);
        setMessage("好吃！谢谢~ 🍽️");

        setTimeout(() => {
            setCurrentState(FrogState.HAPPY);
            setTimeout(() => setCurrentState(FrogState.IDLE), 1000);
        }, 2000);
    }, [interactive, currentState]);

    return (
        <div className="relative inline-block" style={{ width: size, height: size }}>
            {/* 消息气泡 */}
            <AnimatePresence>
                {message && (
                    <SpeechBubble
                        message={message}
                        onComplete={() => setMessage(null)}
                    />
                )}
            </AnimatePresence>

            {/* 睡觉时的 Zzz */}
            {currentState === FrogState.SLEEPING && <SleepingZzz />}

            {/* 青蛙主体 */}
            <motion.div
                className="cursor-pointer select-none"
                variants={frogVariants}
                animate={currentState}
                onClick={handleClick}
                onDoubleClick={handleFeed}
                whileHover={interactive ? { scale: 1.05 } : undefined}
                whileTap={interactive ? { scale: 0.95 } : undefined}
            >
                {/* SVG 青蛙 */}
                <svg
                    viewBox="0 0 100 100"
                    width={size}
                    height={size}
                    className="drop-shadow-lg"
                >
                    {/* 身体 */}
                    <ellipse cx="50" cy="60" rx="35" ry="30" fill="#4ade80" />

                    {/* 头 */}
                    <ellipse cx="50" cy="35" rx="30" ry="25" fill="#4ade80" />

                    {/* 眼睛底座 */}
                    <circle cx="35" cy="25" r="12" fill="#4ade80" />
                    <circle cx="65" cy="25" r="12" fill="#4ade80" />

                    {/* 眼白 */}
                    <motion.ellipse
                        cx="35" cy="25" rx="8" ry="10"
                        fill="white"
                        variants={eyeVariants}
                        animate={eyeState}
                    />
                    <motion.ellipse
                        cx="65" cy="25" rx="8" ry="10"
                        fill="white"
                        variants={eyeVariants}
                        animate={eyeState}
                    />

                    {/* 瞳孔 */}
                    <motion.circle
                        cx="35" cy="25" r="4"
                        fill="#1a1a1a"
                        variants={eyeVariants}
                        animate={eyeState}
                    />
                    <motion.circle
                        cx="65" cy="25" r="4"
                        fill="#1a1a1a"
                        variants={eyeVariants}
                        animate={eyeState}
                    />

                    {/* 脸颊红晕 */}
                    <ellipse cx="25" cy="40" rx="6" ry="4" fill="#f9a8d4" opacity="0.6" />
                    <ellipse cx="75" cy="40" rx="6" ry="4" fill="#f9a8d4" opacity="0.6" />

                    {/* 嘴巴 */}
                    <path
                        d={currentState === FrogState.HAPPY || currentState === FrogState.EATING
                            ? "M 35 45 Q 50 55 65 45"
                            : "M 40 45 Q 50 48 60 45"
                        }
                        stroke="#2d5a27"
                        strokeWidth="2"
                        fill="none"
                    />

                    {/* 前腿 */}
                    <ellipse cx="25" cy="75" rx="10" ry="8" fill="#22c55e" />
                    <ellipse cx="75" cy="75" rx="10" ry="8" fill="#22c55e" />

                    {/* 后腿 */}
                    <ellipse cx="20" cy="85" rx="12" ry="6" fill="#22c55e" />
                    <ellipse cx="80" cy="85" rx="12" ry="6" fill="#22c55e" />

                    {/* 旅行状态时的背包 */}
                    {currentState === FrogState.TRAVELING && (
                        <g>
                            <rect x="55" y="50" width="20" height="25" rx="3" fill="#854d0e" />
                            <rect x="57" y="52" width="16" height="8" rx="2" fill="#a16207" />
                            <line x1="65" y1="45" x2="65" y2="50" stroke="#854d0e" strokeWidth="3" />
                        </g>
                    )}
                </svg>
            </motion.div>

            {/* 状态指示器 */}
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-500">
                {currentState === FrogState.TRAVELING && '🌍 旅行中...'}
                {currentState === FrogState.SLEEPING && '💤 休息中...'}
                {currentState === FrogState.EATING && '🍽️ 吃饭中...'}
            </div>
        </div>
    );
};

export default FrogPetAnimated;