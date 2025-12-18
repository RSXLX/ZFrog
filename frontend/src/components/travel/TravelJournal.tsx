import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface JournalProps {
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

export function TravelJournal({
  frogName,
  title,
  content,
  mood,
  highlights,
  souvenir,
  completedAt,
}: JournalProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-lg p-6"
    >
      {/* 标题区域 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-amber-900">
          {moodEmojis[mood] || '📔'} {title}
        </h2>
        <span className="text-sm text-amber-600">
          {formatDistanceToNow(completedAt, { addSuffix: true, locale: zhCN })}
        </span>
      </div>
      
      {/* 日记内容 */}
      <div className="bg-white/70 rounded-xl p-4 mb-4">
        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
          {content}
        </p>
      </div>
      
      {/* 亮点 */}
      {highlights.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-amber-800 mb-2">
            ✨ 亮点
          </h3>
          <div className="flex flex-wrap gap-2">
            {highlights.map((highlight, index) => (
              <span
                key={index}
                className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm"
              >
                {highlight}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* 纪念品 */}
      {souvenir && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
          className="border-t border-amber-200 pt-4"
        >
          <h3 className="text-sm font-semibold text-amber-800 mb-2">
            🎁 获得纪念品！
          </h3>
          <div className="flex items-center gap-3">
            <div className="text-3xl">
              {souvenir.rarity === 'Rare' ? '💎' :
               souvenir.rarity === 'Uncommon' ? '🌟' : '📦'}
            </div>
            <div>
              <div className="font-medium">{souvenir.name}</div>
              <span className={`text-xs px-2 py-0.5 rounded ${rarityColors[souvenir.rarity]}`}>
                {souvenir.rarity}
              </span>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* 签名 */}
      <div className="text-right mt-4 text-amber-600 italic">
        — {frogName} 🐸
      </div>
    </motion.div>
  );
}
