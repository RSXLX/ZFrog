// frontend/src/components/travel/TravelJournal.tsx
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, memo } from 'react';
import { travelFeatureApi } from '../../features/travel/api';

// 支持两种使用方式的 props
interface Travel {
    id: number;
    frogId: number;
    startTime: string;
    endTime: string;
    targetWallet: string;
    chainId: number;
    status: string;
    journalHash?: string;
    journalContent?: string | null;
    journal?: {
        title: string;
        content: string;
        mood: string;
        highlights: string[];
    } | null;
    souvenir?: {
        id?: string | number;
        name: string;
        rarity: string;
        imageUrl?: string;
    } | null;
    completedAt?: string | null;
}

// 直接传递属性的方式
interface DirectJournalProps {
    frogName: string;
    title: string;
    content: string;
    mood: string;
    highlights: string[];
    chainId?: number;
    targetWallet?: string;
    souvenir?: {
        id?: string | number;
        name: string;
        rarity: string;
        imageUrl?: string;
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

export const TravelJournal = memo(function TravelJournal(props: JournalProps) {
    const navigate = useNavigate();
    
    // 根据 props 类型提取数据
    let frogName: string;
    let title: string;
    let content: string;
    let mood: string;
    let highlights: string[];
    let souvenir: { id?: string | number; name: string; rarity: string; imageUrl?: string } | undefined;
    let completedAt: Date;
    let chainId: number | undefined;
    let targetWallet: string | undefined;
    let travelId: number | undefined;

    if (isTravelProps(props)) {
        // 从 travel 对象提取
        const { travel } = props;
        frogName = 'Froggy'; // 默认名称
        title = travel.journal?.title || `旅行 #${travel.id}`;
        
        // 优先尝试从解析好的 journal 对象获取内容，如果没有则尝试原始 journalContent 字符串
        content = travel.journal?.content || travel.journalContent || (travel.status === 'Completed' ? '这是一次美妙的旅行体验...' : '正在旅行中...');
        
        mood = travel.journal?.mood || 'happy';
        highlights = travel.journal?.highlights || [];
        souvenir = travel.souvenir || undefined;
        
        // 如果是 P0 旅行，从 souvenirData 提取纪念品
        if (!souvenir && (travel as any).souvenirData) {
            const sData = (travel as any).souvenirData;
            souvenir = {
                name: sData.name,
                rarity: mapRarity(sData.rarity)
            };
        }

        completedAt = new Date(travel.completedAt || travel.endTime);
        chainId = travel.chainId;
        targetWallet = travel.targetWallet;
        travelId = travel.id;
    } else {
        // 直接使用传入的属性
        frogName = props.frogName;
        title = props.title;
        content = props.content;
        mood = props.mood;
        highlights = props.highlights;
        souvenir = props.souvenir ? { ...props.souvenir } : undefined;
        completedAt = props.completedAt;
        chainId = props.chainId;
        targetWallet = props.targetWallet;
        travelId = undefined; // 直接属性模式下没有travelId
    }

    // 添加纪念品图片状态管理
    const [souvenirImageUrl, setSouvenirImageUrl] = useState<string | undefined>(souvenir?.imageUrl);

    useEffect(() => {
        if (souvenir && !souvenirImageUrl) {
            const s = (props as any).travel?.souvenir || (props as any).souvenir;
            const souvenirId = s?.tokenId || 
                             ((props as any).travel?.souvenirData ? `p0-${(props as any).travel.id}` : null);
            
            if (souvenirId) {
                travelFeatureApi.getSouvenirImageStatus(souvenirId.toString())
                    .then(res => {
                        if (res.success && res.record) {
                            const displayUrl = res.record.gatewayUrl || res.record.imageUrl;
                            if (displayUrl) {
                                setSouvenirImageUrl(displayUrl);
                            }
                        }
                    })
                    .catch(() => {});
            }
        }
    }, [souvenir, props]);

    // 使用局部状态覆盖
    if (souvenir) {
        souvenir = { ...souvenir, imageUrl: souvenirImageUrl };
    }

    // 点击处理函数
    const handleJournalClick = () => {
        if (travelId) {
            navigate(`/travel/${travelId}`);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: travelId ? 1.02 : 1 }}
            whileTap={{ scale: travelId ? 0.98 : 1 }}
            className={`bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 ${
                travelId ? 'cursor-pointer hover:shadow-xl transition-all duration-200' : ''
            }`}
            onClick={handleJournalClick}
        >
            {/* 标题区域 */}
            <div className="bg-gradient-to-r from-emerald-400 to-cyan-500 p-4 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold">{title}</h3>
                        <p className="text-xs opacity-80">
                            {formatDistanceToNow(completedAt, { addSuffix: true, locale: zhCN })}
                        </p>
                    </div>
                    <span className="text-3xl filter drop-shadow-sm">{moodEmojis[mood] || '😊'}</span>
                </div>
            </div>

            {/* 详情资料栏 */}
            {(chainId || targetWallet) && (
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-4 text-xs text-gray-500">
                    {chainId && (
                        <div className="flex items-center">
                            <span className="mr-1">🌐</span>
                            <span className="font-medium">目标链 ID:</span>
                            <span className="ml-1 bg-gray-200 px-1.5 py-0.5 rounded text-gray-700">{chainId}</span>
                        </div>
                    )}
                    {targetWallet && (
                        <div className="flex items-center">
                            <span className="mr-1">👛</span>
                            <span className="font-medium">目标地址:</span>
                            <span className="ml-1 font-mono">{targetWallet.slice(0, 6)}...{targetWallet.slice(-4)}</span>
                        </div>
                    )}
                </div>
            )}

            {/* 日记内容 */}
            <div className="p-4 space-y-4">
                <div className="relative">
                    <span className="absolute -left-2 -top-2 text-4xl text-gray-100 select-none">“</span>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line relative z-10 pl-2">
                        {content}
                    </p>
                    <span className="absolute -right-2 -bottom-4 text-4xl text-gray-100 select-none">”</span>
                </div>

                {/* 亮点 */}
                {highlights.length > 0 && (
                    <div className="pt-2">
                        <div className="flex items-center mb-2">
                            <div className="h-px flex-1 bg-gray-100"></div>
                            <span className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider">旅行亮点</span>
                            <div className="h-px flex-1 bg-gray-100"></div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {highlights.map((highlight, index) => (
                                <span 
                                    key={index}
                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100"
                                >
                                    ✨ {highlight}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* 纪念品 */}
                {souvenir && (
                    <motion.div 
                        whileHover={{ scale: 1.02 }}
                        className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-100 shadow-sm"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-bold text-yellow-800 flex items-center">
                                <span className="mr-2">🎁</span> 发现稀有纪念品！
                            </h4>
                            <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter ${
                                    rarityColors[souvenir.rarity] || rarityColors.Common
                                }`}
                            >
                                {souvenir.rarity}
                            </span>
                        </div>
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-2xl shadow-inner border border-yellow-200 overflow-hidden">
                                {souvenir.imageUrl ? (
                                    <img src={souvenir.imageUrl} alt={souvenir.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span>🏆</span>
                                )}
                            </div>
                            <span className="font-bold text-gray-800">{souvenir.name}</span>
                        </div>
                    </motion.div>
                )}

                {/* 签名 */}
                <div className="pt-4 flex items-center justify-end text-sm text-gray-400">
                    <div className="h-px w-8 bg-gray-200 mr-2"></div>
                    <span className="italic">Written by</span>
                    <span className="ml-1 font-bold text-gray-500">{frogName}</span>
                    <span className="ml-1">🐸</span>
                </div>
            </div>
        </motion.div>
    );
});

const mapRarity = (r: number | string) => {
    if (typeof r === 'string') return r;
    const rarities = ['Common', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
    return rarities[r] || 'Common';
};
