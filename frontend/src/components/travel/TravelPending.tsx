import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface TravelPendingProps {
    txHash: string;
    onReset: () => void; // Allow user to manually reset if stuck
}

export function TravelPending({ txHash, onReset }: TravelPendingProps) {
    const [step, setStep] = useState(0);

    // Simulated progress steps
    useEffect(() => {
        const timers: NodeJS.Timeout[] = [];
        
        timers.push(setTimeout(() => setStep(1), 2000)); // Packing
        timers.push(setTimeout(() => setStep(2), 5000)); // Walking to Bridge
        timers.push(setTimeout(() => setStep(3), 10000)); // Crossing
        
        return () => timers.forEach(clearTimeout);
    }, []);

    const steps = [
        { icon: '📝', text: '正在签署旅行协议...' },
        { icon: '🎒', text: '青蛙正在打包干粮...' },
        { icon: '🌉', text: '正在前往跨链桥...' },
        { icon: '📡', text: '等待 ZetaChain 网络确认...' },
    ];

    const currentStep = steps[Math.min(step, steps.length - 1)];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-100 rounded-2xl shadow-xl p-8 text-center space-y-6"
        >
            <div className="relative w-24 h-24 mx-auto">
                <motion.div
                    animate={{ 
                        rotate: 360,
                        scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                        rotate: { duration: 3, repeat: Infinity, ease: "linear" },
                        scale: { duration: 2, repeat: Infinity }
                    }}
                    className="absolute inset-0 border-4 border-dashed border-purple-300 rounded-full"
                />
                <div className="absolute inset-0 flex items-center justify-center text-4xl">
                    {currentStep.icon}
                </div>
            </div>

            <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-800">
                    旅行准备中...
                </h3>
                <p className="text-purple-600 font-medium animate-pulse">
                    {currentStep.text}
                </p>
                <p className="text-xs text-gray-500 max-w-xs mx-auto">
                    交易已提交，请耐心等待区块确认。这通常需要 15-30 秒。
                </p>
            </div>

            <div className="pt-4 border-t border-purple-100">
                <a 
                    href={`https://athens.explorer.zetachain.com/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:text-blue-700 flex items-center justify-center gap-1"
                >
                    <span>🔍</span>
                    <span>查看链上交易</span>
                </a>
            </div>

            {/* Failsafe reset after 30s */}
            {step >= 3 && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 5 }}
                    className="pt-2"
                >
                    <button 
                        onClick={onReset}
                        className="text-xs text-gray-400 hover:text-gray-600 underline"
                    >
                        如果长时间卡住，点击此处重置界面
                    </button>
                </motion.div>
            )}
        </motion.div>
    );
}
