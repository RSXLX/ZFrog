// frontend/src/components/chat/ChatPanel.tsx

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { QuickReplies } from './QuickReplies';
import { chatApi } from '../../services/chat.api';
import { ZETAFROG_ADDRESS, ZETAFROG_ABI } from '../../config/contracts';

interface ChatPanelProps {
  frogId: number;
  frogName: string;
  personality: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  data?: any;
  timestamp?: Date;
}

export function ChatPanel({ frogId, frogName, personality }: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [travelParams, setTravelParams] = useState<any>(null);

  // Wagmi hooks for contract interaction
  const {
    data: hash,
    writeContract,
    isPending: isTxPending,
    error: writeError,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 处理交易状态更新
  useEffect(() => {
    if (isTxPending) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '✍️ 请在钱包中确认交易...',
      }]);
    }
  }, [isTxPending]);

  useEffect(() => {
    if (isConfirming) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⏳ 交易已提交，等待区块确认...',
      }]);
    }
  }, [isConfirming]);

  useEffect(() => {
    if (isTxSuccess) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '✈️ 旅行已开始！青蛙出发啦，记得回来看看游记哦~',
      }]);
      
      // 触发刷新事件
      window.dispatchEvent(new CustomEvent('travel:started', { 
        detail: { frogId, timestamp: Date.now() } 
      }));
    }
  }, [isTxSuccess, frogId]);

  useEffect(() => {
    if (writeError) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ 呱...交易失败了：${writeError.message.slice(0, 100)}`,
      }]);
    }
  }, [writeError]);

  // 发送消息
  const handleSend = async (text: string) => {
    // 添加用户消息
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setShowQuickReplies(false);
    setIsLoading(true);

    try {
      const response = await chatApi.sendMessage(frogId, text);
      
      // 添加青蛙回复
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.reply.content,
        intent: response.reply.intent,
        data: response.reply.data,
      }]);

      // 处理 START_TRAVEL 行动
      if (response.reply.intent === 'start_travel' && response.reply.data?.action === 'START_TRAVEL') {
        const params = response.reply.data.travelParams;
        
        if (params && ZETAFROG_ADDRESS) {
          setTravelParams(params);
          
          // 触发合约调用
          try {
            writeContract({
              address: ZETAFROG_ADDRESS,
              abi: ZETAFROG_ABI,
              functionName: 'startTravel',
              args: [
                BigInt(params.tokenId), 
                params.targetWallet as `0x${string}`, 
                BigInt(params.duration), 
                BigInt(params.chainId)
              ],
            });
            
            // 添加提示消息
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: '🎒 正在打开钱包准备旅行...',
            }]);
          } catch (error) {
            console.error('Contract write failed:', error);
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: '呱...钱包好像打不开了，等会再试试？',
            }]);
          }
        } else if (!ZETAFROG_ADDRESS) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: '呱...合约地址没配置好，找管理员看看吧！',
          }]);
        }
      }
    } catch (error) {
      // 错误处理
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '呱...出了点问题，等会再试试？',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // 快捷回复
  const quickReplies = [
    { label: '💰 查价格', text: 'ETH 现在多少钱？' },
    { label: '👛 看资产', text: '我钱包里有多少钱？' },
    { label: '🐸 问状态', text: '你现在在干嘛？' },
    { label: '🎲 去旅行', text: '我想去旅行' },
    { label: '👋 打招呼', text: '你好呀~' },
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '380px'
    }}>
      {/* 消息列表 */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
        className="messages-container"
      >
        {/* 欢迎消息 */}
        {messages.length === 0 && (
          <motion.div
            className="welcome-message"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px',
              background: 'rgba(74, 222, 128, 0.1)',
              borderRadius: '12px',
              border: '1px dashed rgba(74, 222, 128, 0.3)'
            }}
          >
            <div style={{ fontSize: '32px' }}>🐸</div>
            <div style={{
              color: '#ccc',
              fontSize: '14px',
              lineHeight: '1.5'
            }}>
              <p>呱！我是 <strong style={{ color: '#4ade80' }}>{frogName}</strong></p>
              <p>有什么想问我的吗？</p>
            </div>
          </motion.div>
        )}

        {/* 消息列表 */}
        <AnimatePresence>
          {messages.map((msg, index) => (
            <ChatMessage
              key={index}
              message={msg}
              frogName={frogName}
            />
          ))}
        </AnimatePresence>

        {/* 加载中 */}
        {isLoading && (
          <motion.div
            className="typing-indicator"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 0'
            }}
          >
            <span 
              style={{
                fontSize: '20px',
                animation: 'bounce 0.6s infinite'
              }}
            >
              🐸
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#4ade80',
                animation: 'typing 1.4s infinite'
              }}></span>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#4ade80',
                animation: 'typing 1.4s infinite',
                animationDelay: '0.2s'
              }}></span>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#4ade80',
                animation: 'typing 1.4s infinite',
                animationDelay: '0.4s'
              }}></span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 快捷回复 */}
      <AnimatePresence>
        {showQuickReplies && messages.length === 0 && (
          <QuickReplies
            replies={quickReplies}
            onSelect={handleSend}
          />
        )}
      </AnimatePresence>

      {/* 输入框 */}
      <ChatInput
        onSend={handleSend}
        disabled={isLoading}
        placeholder="和青蛙聊点什么..."
      />
    </div>
  );
}