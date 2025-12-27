// frontend/src/components/chat/ChatMessage.tsx

import { motion } from 'framer-motion';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  data?: any;
  timestamp?: Date;
}

interface ChatMessageProps {
  message: Message;
  frogName: string;
}

export function ChatMessage({ message, frogName }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      className={`chat-message ${isUser ? 'user' : 'assistant'}`}
      initial={{ opacity: 0, y: 10, x: isUser ? 10 : -10 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-start',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        flexDirection: 'row'
      }}
    >
      {/* 头像 */}
      {!isUser && (
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(74, 222, 128, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            flexShrink: 0
          }}
        >
          🐸
        </div>
      )}

      <div
        style={{
          maxWidth: '75%'
        }}
      >
        {/* 发送者名称 */}
        <div
          style={{
            fontSize: '11px',
            color: '#888',
            marginBottom: '4px'
          }}
        >
          {isUser ? '你' : frogName}
        </div>

        {/* 消息文本 */}
        <div
          style={{
            background: isUser ? 'rgba(74, 222, 128, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            padding: '10px 14px',
            borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
            color: '#eee',
            fontSize: '14px',
            lineHeight: '1.5',
            wordBreak: 'break-word'
          }}
        >
          {message.content}
        </div>

        {/* 附加数据卡片 */}
        {message.data && (
          <div style={{ marginTop: '8px' }}>
            {message.intent === 'price_query' && (
              <div
                style={{
                  padding: '8px 12px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#60a5fa', fontWeight: 'bold' }}>{message.data.symbol}</span>
                  <span style={{ color: '#93c5fd' }}>${message.data.priceUsd?.toLocaleString()}</span>
                </div>
              </div>
            )}
            {message.intent === 'asset_query' && (
              <div
                style={{
                  padding: '8px 12px',
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              >
                <div style={{ color: '#86efac', fontWeight: 'bold' }}>
                  总资产: ${message.data.totalValueUsd?.toLocaleString()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 用户头像 */}
      {isUser && (
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(59, 130, 246, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            flexShrink: 0
          }}
        >
          👤
        </div>
      )}
    </motion.div>
  );
}