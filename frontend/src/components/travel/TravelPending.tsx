import { motion } from 'framer-motion';

export function TravelPending() {
    console.log('[TravelPending] Rendered: Waiting for blockchain confirmation...');
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-8 space-y-6 text-center"
        >
            <div className="relative w-24 h-24 mx-auto">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border-4 border-green-100 rounded-full"
                />
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border-4 border-t-green-500 border-r-transparent border-b-transparent border-l-transparent rounded-full"
                />
                <div className="absolute inset-0 flex items-center justify-center text-4xl">
                    ⏳
                </div>
            </div>

            <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-800">交易已确认，正在同步...</h3>
                <p className="text-gray-500">
                    区块链已确认您的旅行请求
                    <br />
                    <span className="text-xs text-gray-400">正在等待数据同步 (通常需 5-10 秒)</span>
                </p>
            </div>

            <div className="flex justify-center space-x-1">
                {[0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        className="w-2 h-2 bg-green-500 rounded-full"
                    />
                ))}
            </div>
        </motion.div>
    );
}
