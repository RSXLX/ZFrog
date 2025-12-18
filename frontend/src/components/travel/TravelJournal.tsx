// frontend/src/components/travel/TravelJournal.tsx
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 支持两种使用方式的 props
interface Travel {
    id: number;
    startTime: string;
    endTime: string;
    targetWallet: string;
    status: string;
    completed: boolean;
    journal?: {
        title: string;
        content: string;
        mood: string;
        highlights: string[];
    };
    souvenir?: {
        name: string;
        rarity: string;
    };
}

// 直接传递属性的方式
interface DirectJournalProps {
    frogName: string;
    title: string;
    content: string;
    mood: string;
    highlights: string[];
    souvenir?: {
        name: string;
        rarity: string;
    };
    completedAt: Date;
}

// 通过 travel 对象传递的方式
interface TravelJournalProps {
    travel: Travel;
}

export type JournalProps = DirectJournalProps | TravelJournalProps;

// 类型守卫
function isTravelProps(props: JournalProps): props is TravelJournalProps {
    return 'travel' in props;
}

const moodEmojis: Record<string, string> = {
    happy: '😊',
    excited: '🤩',
    thoughtful: '🤔',
    adventurous: '🧗',
    tired: '😴',
};

const rarityColors: Record<string, string> = {
    Common: 'bg-gray-100 text-gray-800',
    Uncommon: 'bg-green-100 text-green-800',
    Rare: 'bg-purple-100 text-purple-800',
};

export function TravelJournal(props: JournalProps) {
    // 根据 props 类型提取数据
    let frogName: string;
    let title: string;
    let content: string;
    let mood: string;
    let highlights: string[];
    let souvenir: { name: string; rarity: string } | undefined;
    let completedAt: Date;

    if (isTravelProps(props)) {
        // 从 travel 对象提取
        const { travel } = props;
        frogName = 'Froggy'; // 默认名称
        title = travel.journal?.title || `旅行 #${travel.id}`;
        content = travel.journal?.content || '这是一次美妙的旅行体验...';
        mood = travel.journal?.mood || 'happy';
        highlights = travel.journal?.highlights || [];
        souvenir = travel.souvenir;
        completedAt = new Date(travel.endTime);
    } else {
        // 直接使用传入的属性
        frogName = props.frogName;
        title = props.title;
        content = props.content;
        mood = props.mood;
        highlights = props.highlights;
        souvenir = props.souvenir;
        completedAt = props.completedAt;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
            {/* 标题区域 */}
            <div className="bg-gradient-to-r from-green-400 to-blue-500 p-4 text-white">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">{title}</h3>
                    <span className="text-2xl">{moodEmojis[mood] || '😊'}</span>
                </div>
                <p className="text-sm opacity-80 mt-1">
                    {formatDistanceToNow(completedAt, { addSuffix: true, locale: zhCN })}
                </p>
            </div>

            {/* 日记内容 */}
            <div className="p-4 space-y-4">
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {content}
                </p>

                {/* 亮点 */}
                {highlights.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-500">✨ 旅行亮点</h4>
                        <ul className="space-y-1">
                            {highlights.map((highlight, index) => (
                                <li
                                    key={index}
                                    className="text-sm text-gray-600 flex items-start"
                                >
                                    <span className="text-green-500 mr-2">•</span>
                                    {highlight}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* 纪念品 */}
                {souvenir && (
                    <div className="bg-yellow-50 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                            🎁 获得纪念品！
                        </h4>
                        <div className="flex items-center space-x-2">
                            <span className="text-xl">🏆</span>
                            <span className="font-medium">{souvenir.name}</span>
                            <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                    rarityColors[souvenir.rarity] || rarityColors.Common
                                }`}
                            >
                                {souvenir.rarity}
                            </span>
                        </div>
                    </div>
                )}

                {/* 签名 */}
                <div className="text-right text-sm text-gray-400 italic">
                    — {frogName} 🐸
                </div>
            </div>
        </motion.div>
    );
}