// frontend/src/components/frog/FrogPetAnimated.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFrogStatus } from '../../hooks/useFrogStatus';
import { FrogState } from '../../types/frogAnimation';

interface FrogPetAnimatedProps {
    frogId?: number;
    frogName?: string;
    initialState?: FrogState;
    size?: number;
    interactive?: boolean;
}

// 动画变体
const frogVariants: Record<string, any> = {
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
const eyeVariants: Record<string, any> = {
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
                {/* 新版 SVG 青蛙 */}
                <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
                    <defs>
                        <linearGradient id="skinGradientAnim" x1="100" y1="0" x2="100" y2="200" gradientUnits="userSpaceOnUse">
                            <motion.stop 
                                offset="0.4" 
                                animate={{ 
                                    stopColor: currentState === FrogState.HAPPY || currentState === FrogState.TRAVELING ? '#4ADE80' : 
                                               currentState === FrogState.ANGRY ? '#ef4444' : '#4ade80' 
                                }} 
                            />
                            <motion.stop 
                                offset="0.8" 
                                animate={{ 
                                    stopColor: currentState === FrogState.HAPPY || currentState === FrogState.TRAVELING ? '#FCD34D' : 
                                               currentState === FrogState.ANGRY ? '#b91c1c' : '#fcd34d' 
                                }} 
                            />
                            <motion.stop 
                                offset="1.0" 
                                animate={{ 
                                    stopColor: currentState === FrogState.HAPPY || currentState === FrogState.TRAVELING ? '#FDBA74' : 
                                               currentState === FrogState.ANGRY ? '#7f1d1d' : '#fdba74' 
                                }} 
                            />
                        </linearGradient>
                        
                        <filter id="softShadowAnim" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                            <feOffset dx="0" dy="3" result="offsetblur"/>
                            <feComponentTransfer>
                                <feFuncA type="linear" slope="0.2"/>
                            </feComponentTransfer>
                            <feMerge>
                                <feMergeNode/>
                                <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>

                        <style>{`
                            @keyframes squishAnim {
                                0%, 100% { transform: scale(1, 1) translateY(0); }
                                50% { transform: scale(1.03, 0.97) translateY(3px); }
                            }
                            @keyframes blinkAnim {
                                0%, 96%, 100% { transform: scaleY(1); }
                                98% { transform: scaleY(0.1); }
                            }
                            .frog-body-anim {
                                transform-origin: bottom center;
                                animation: squishAnim 3.5s ease-in-out infinite;
                            }
                            .frog-pupil-anim {
                                transform-origin: center;
                                animation: blinkAnim 4.5s infinite;
                            }
                        `}</style>
                    </defs>

                    <g className="frog-body-anim" filter="url(#softShadowAnim)">
                        {/* 身体主体 */}
                        <motion.path 
                            d="M 45 75 A 32 32 0 1 1 90 60 Q 100 70 110 60 A 32 32 0 1 1 155 75 C 180 90 190 120 190 145 C 190 180 150 190 100 190 C 50 190 10 180 10 145 C 10 120 20 90 45 75 Z" 
                            fill="url(#skinGradientAnim)" 
                            stroke={currentState === FrogState.ANGRY ? '#991b1b' : '#22C55E'} 
                            strokeWidth="1.5" 
                            strokeLinejoin="round"
                            animate={{
                                stroke: currentState === FrogState.ANGRY ? '#991b1b' : '#22C55E'
                            }}
                        />

                        {/* 左眼 */}
                        <g transform="translate(60, 45)">
                            <circle cx="0" cy="0" r="24" fill="#FEF9C3" stroke="#D9F99D" strokeWidth="1"/>
                            <g className="frog-pupil-anim" style={{ transform: eyeState === 'sleeping' ? 'scaleY(0.1)' : undefined }}>
                                <motion.circle 
                                    cx="0" cy="0" r="16" fill="#1F2937"
                                    animate={{
                                        scale: currentState === FrogState.HAPPY ? 1.1 : 1
                                    }}
                                />
                                <circle cx="-5" cy="-5" r="5" fill="white" opacity="0.9"/>
                            </g>
                        </g>
                        
                        {/* 右眼 */}
                        <g transform="translate(140, 45)">
                            <circle cx="0" cy="0" r="24" fill="#FEF9C3" stroke="#D9F99D" strokeWidth="1"/>
                            <g className="frog-pupil-anim" style={{ transform: eyeState === 'sleeping' ? 'scaleY(0.1)' : undefined }}>
                                <motion.circle 
                                    cx="0" cy="0" r="16" fill="#1F2937"
                                    animate={{
                                        scale: currentState === FrogState.HAPPY ? 1.1 : 1
                                    }}
                                />
                                <circle cx="-5" cy="-5" r="5" fill="white" opacity="0.9"/>
                            </g>
                        </g>

                        {/* 鼻孔 */}
                        <circle cx="92" cy="100" r="1.5" fill="#15803D" opacity="0.6"/>
                        <circle cx="108" cy="100" r="1.5" fill="#15803D" opacity="0.6"/>
                        
                        {/* 腮红 */}
                        <ellipse cx="30" cy="125" rx="12" ry="8" fill="#FDA4AF" opacity="0.4"/>
                        <ellipse cx="170" cy="125" rx="12" ry="8" fill="#FDA4AF" opacity="0.4"/>

                        {/* 动态嘴巴 */}
                        <motion.path
                            d={currentState === FrogState.HAPPY || currentState === FrogState.EATING
                                ? "M 80 130 Q 100 150 120 130"
                                : "M 90 135 Q 100 138 110 135"
                            }
                            stroke="#15803D"
                            strokeWidth="2.5"
                            fill="none"
                            strokeLinecap="round"
                            animate={{
                                d: currentState === FrogState.HAPPY || currentState === FrogState.EATING
                                    ? "M 80 130 Q 100 150 120 130"
                                    : "M 90 135 Q 100 138 110 135"
                            }}
                        />
                           
                        {/* Zeta 标志 */}
                        <path d="M96 152 L104 152 L96 160 L104 160" stroke="#15803D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
                    </g>
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
