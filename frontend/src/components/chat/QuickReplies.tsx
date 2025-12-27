// frontend/src/components/chat/QuickReplies.tsx

import { motion } from 'framer-motion';

interface QuickReply {
  label: string;
  text: string;
}

interface QuickRepliesProps {
  replies: QuickReply[];
  onSelect: (text: string) => void;
}

export function QuickReplies({ replies, onSelect }: QuickRepliesProps) {
  return (
    <motion.div
      className="quick-replies"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        padding: '8px 16px',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)'
      }}
    >
      {replies.map((reply, index) => (
        <motion.button
          key={index}
          className="quick-reply-btn"
          onClick={() => onSelect(reply.text)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, x: -10 }}
          animate={{ 
            opacity: 1, 
            x: 0,
            transition: { delay: index * 0.1 }
          }}
          style={{
            padding: '6px 12px',
            background: 'rgba(74, 222, 128, 0.1)',
            border: '1px solid rgba(74, 222, 128, 0.3)',
            borderRadius: '16px',
            color: '#4ade80',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {reply.label}
        </motion.button>
      ))}
    </motion.div>
  );
}