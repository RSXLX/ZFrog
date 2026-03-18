import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { useFrogState } from '../../hooks/useFrogState';
import { useChainMonitor } from '../../hooks/useChainMonitor';
import { useFrogInteraction } from '../../hooks/useFrogInteraction';
import { useClickThrough } from '../../hooks/useClickThrough';
import { PetManager } from '../../utils/PetManager';
import { ParticleEffect } from './ParticleEffect';
import { SpeechBubble, ChainEventBubble } from './SpeechBubble';
import { FrogState, FrogMood } from '../../types/frogAnimation';
import { ChatBubble } from '../chat/ChatBubble';

interface FrogPetProps {
  frogId: number;
  name: string;
  initialState?: FrogState;
  onInteract?: (interaction: string) => void;
}

export function FrogPet({ frogId, name, initialState = FrogState.IDLE, onInteract }: FrogPetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();
  
  // 青蛙状态管理
  const {
    state: frogState,
    setState,
    setMood,
    updateEnergy,
    setPosition,
    setDirection,
    getCurrentAnimationConfig,
    feed,
    interact,
  } = useFrogState(initialState);

  const {
    currentState: state,
    mood,
    energy,
    position,
    direction,
  } = frogState;
  
  // 链上监控
  const { 
    latestEvent, 
    priceChange, 
    whaleAlert,
    gasPrice 
  } = useChainMonitor();
  
  // 互动系统
  const {
    recordClick,
    pet,
    getSuggestion,
    getFrogMood,
  } = useFrogInteraction();
  
  // 桌面宠物点击穿透 (仅 Tauri 环境生效)
  const {
    isTauri,
    isSupported: isClickThroughSupported,
    handleMouseEnterFrog,
    handleMouseLeaveFrog,
  } = useClickThrough({ enabled: true });
  
  // 当前动画帧
  const [currentFrame, setCurrentFrame] = useState(0);
  const [showSpeech, setShowSpeech] = useState(false);
  const [speechText, setSpeechText] = useState('');
  const [particles, setParticles] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [showChat, setShowChat] = useState(false);
  
  // 动画配置
  const animConfig = getCurrentAnimationConfig();
  
  // 帧动画循环
  useEffect(() => {
    if (!animConfig || !animConfig.loop) return;
    
    const frameTime = animConfig.duration / animConfig.frames;
    const interval = setInterval(() => {
      setCurrentFrame(prev => {
        if (prev >= animConfig.frames - 1) {
          return animConfig.loop ? 0 : prev;
        }
        return prev + 1;
      });
    }, frameTime);
    
    return () => clearInterval(interval);
  }, [state, animConfig]);
  
  // 链上事件反应
  useEffect(() => {
    if (!latestEvent) return;
    
    handleChainEvent(latestEvent);
  }, [latestEvent]);
  
  // 鲸鱼警报反应
  useEffect(() => {
    if (!whaleAlert) return;
    
    handleWhaleAlert(whaleAlert);
  }, [whaleAlert]);
  
  // 价格变化反应
  useEffect(() => {
    handlePriceChange(priceChange);
  }, [priceChange]);
  
  // 处理链上事件
  const handleChainEvent = useCallback((event: any) => {
    const { type, value, token } = event;
    
    switch (type) {
      case 'large_buy':
        triggerReaction(FrogState.EXCITED, `哇！有人买了 ${formatAmount(value)} ${token}！🚀`, 'stars');
        break;
      case 'large_sell':
        triggerReaction(FrogState.SCARED, `啊！大单卖出 ${formatAmount(value)} ${token}！😱`, 'sweat');
        break;
      case 'whale_transfer':
        triggerReaction(FrogState.RICH, `巨鲸出动！${formatAmount(value)} ${token} 在移动！🐋`, 'coins');
        break;
      case 'new_listing':
        triggerReaction(FrogState.CURIOUS, `发现新项目：${token}！🔍`, 'stars');
        break;
    }
  }, []);
  
  // 处理鲸鱼警报
  const handleWhaleAlert = useCallback((alert: any) => {
    const { amount, token, direction } = alert;
    
    if (direction === 'in') {
      triggerReaction(
        FrogState.EXCITED, 
        `🐋 鲸鱼买入 ${formatAmount(amount)} ${token}！`, 
        'coins'
      );
    } else {
      triggerReaction(
        FrogState.SCARED, 
        `🐋 鲸鱼卖出 ${formatAmount(amount)} ${token}！`, 
        'sweat'
      );
    }
  }, []);
  
  // 处理价格变化
  const handlePriceChange = useCallback((change: number) => {
    if (Math.abs(change) < 5) return; // 小于 5% 不反应
    
    if (change >= 20) {
      triggerReaction(FrogState.DANCING, `暴涨 ${change.toFixed(1)}%！起飞！🚀🌙`, 'fire');
    } else if (change >= 10) {
      triggerReaction(FrogState.EXCITED, `涨了 ${change.toFixed(1)}%！不错！📈`, 'stars');
    } else if (change <= -20) {
      triggerReaction(FrogState.CRYING, `暴跌 ${change.toFixed(1)}%！呜呜...💔`, 'tears');
    } else if (change <= -10) {
      triggerReaction(FrogState.SCARED, `跌了 ${change.toFixed(1)}%！小心！📉`, 'sweat');
    }
  }, []);
  
  // 触发反应
  const triggerReaction = useCallback((
    newState: FrogState, 
    text: string, 
    particleType: string | null
  ) => {
    setState(newState);
    setSpeechText(text);
    setShowSpeech(true);
    setParticles(particleType);
    
    // 播放音效
    if (animConfig?.sound) {
      try {
        const audio = new Audio(animConfig.sound);
        audio.volume = 0.3;
        audio.play().catch(() => {});
      } catch (error) {
        // 忽略音频播放错误
      }
    }
    
    // 5 秒后恢复正常
    setTimeout(() => {
      setState(FrogState.IDLE);
      setShowSpeech(false);
      setParticles(null);
    }, 5000);
  }, [animConfig, setState]);
  
  // 点击互动
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    const count = recordClick();
    setClickCount(count);
    
    if (count > 10) {
      // 点太多次会生气
      triggerReaction(FrogState.ANGRY, '别戳了！生气了！😤', null);
    } else if (count > 5) {
      triggerReaction(FrogState.HAPPY, '嘿嘿，好痒！🤭', 'hearts');
    } else {
      // 随机反应
      const reactions = [
        { state: FrogState.HAPPY, text: '你好呀！👋', particles: 'hearts' },
        { state: FrogState.JUMPING, text: '呱呱！🐸', particles: 'stars' },
        { state: FrogState.CURIOUS, text: '嗯？有什么事？🤔', particles: null },
      ];
      const reaction = reactions[Math.floor(Math.random() * reactions.length)];
      triggerReaction(reaction.state as FrogState, reaction.text, reaction.particles);
    }
    
    onInteract?.('click');
  }, [recordClick, triggerReaction, onInteract]);
  
  // 双击互动
  const handleDoubleClick = useCallback(() => {
    triggerReaction(FrogState.LOVE, '最喜欢你了！❤️', 'hearts');
    onInteract?.('double_click');
  }, [triggerReaction, onInteract]);
  
  // 拖拽相关
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    setState(FrogState.SCARED);
    setSpeechText('啊啊啊！放我下来！😵');
    setShowSpeech(true);
  }, [setState]);
  
  const handleDragEnd = useCallback((e: any, info: any) => {
    setIsDragging(false);
    setPosition({
      x: position.x + info.offset.x,
      y: position.y + info.offset.y,
    });
    setState(FrogState.IDLE);
    setShowSpeech(false);
    onInteract?.('drag');
  }, [position, setPosition, setState, onInteract]);

  // 右键菜单处理
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    // 获取FrogPet容器的位置
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      // 计算相对于FrogPet容器的位置
      const relativeX = e.clientX - rect.left;
      const relativeY = e.clientY - rect.top;
      setContextMenuPosition({ x: relativeX, y: relativeY });
    } else {
      // 如果容器引用不可用，回退到原始方法
      setContextMenuPosition({ x: e.clientX, y: e.clientY });
    }
    setShowContextMenu(true);
  }, []);
  
  // 关闭右键菜单
  const closeContextMenu = useCallback(() => {
    setShowContextMenu(false);
  }, []);
  
  // 处理右键菜单项点击
  const handleContextMenuAction = useCallback((action: string) => {
    closeContextMenu();
    
    switch (action) {
      case 'chat':
        setShowChat(true);
        break;
      case 'newPet':
        PetManager.spawnNewPet();
        break;
      case 'saveState':
        PetManager.saveState();
        break;
      case 'hide':
        // 隐藏当前窗口
        (window as any).__TAURI__?.window.getCurrentWindow().hide();
        break;
      case 'close':
        // 关闭当前窗口
        (window as any).__TAURI__?.window.getCurrentWindow().close();
        break;
    }
  }, [closeContextMenu]);
  
  // 点击其他地方关闭右键菜单
  useEffect(() => {
    const handleClick = () => setShowContextMenu(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // 随机待机动作
  useEffect(() => {
    if (state !== FrogState.IDLE || isDragging) return;
    
    const interval = setInterval(() => {
      const random = Math.random();
      if (random > 0.9) {
        const idleActions = [
          { state: FrogState.JUMPING, text: '呱！', particles: null },
          { state: FrogState.CURIOUS, text: '...', particles: null },
          { state: FrogState.HAPPY, text: '😊', particles: 'hearts' },
        ];
        const action = idleActions[Math.floor(Math.random() * idleActions.length)];
        triggerReaction(action.state as FrogState, action.text, action.particles);
      }
    }, 10000); // 每10秒检查一次
    
    return () => clearInterval(interval);
  }, [state, isDragging, triggerReaction]);

  return (
    <motion.div
      ref={containerRef}
      className="relative select-none"
      style={{ 
        width: 200, 
        height: 200,
        x: position.x,
        y: position.y,
      }}
      drag
      dragMomentum={false}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.1 }}
      onContextMenu={handleContextMenu}
    >
      {/* 阴影 */}
      <motion.div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-4 bg-black/20 rounded-full blur-sm"
        animate={{
          scale: state === FrogState.JUMPING ? [1, 0.5, 1] : 1,
          opacity: state === FrogState.JUMPING ? [0.3, 0.1, 0.3] : 0.3,
        }}
        transition={{ duration: 0.5 }}
      />
      
      {/* 青蛙主体 */}
      <motion.div
        className="relative cursor-pointer"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={handleMouseEnterFrog}
        onMouseLeave={handleMouseLeaveFrog}
        animate={controls}
        style={{
          transform: `scaleX(${direction === 'left' ? -1 : 1})`,
        }}
      >
        {/* 新版 SVG 青蛙主体 */}
        <div className="w-full h-full flex items-center justify-center">
          <svg width="180" height="180" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
            <defs>
              <linearGradient id="skinGradient" x1="100" y1="0" x2="100" y2="200" gradientUnits="userSpaceOnUse">
                <motion.stop 
                  offset="0.4" 
                  animate={{ 
                    stopColor: state === FrogState.ANGRY ? '#ef4444' : 
                               state === FrogState.SCARED ? '#fca5a5' : '#4ADE80' 
                  }} 
                />
                <motion.stop 
                  offset="0.8" 
                  animate={{ 
                    stopColor: state === FrogState.ANGRY ? '#b91c1c' : 
                               state === FrogState.SCARED ? '#fecaca' : '#FCD34D' 
                  }} 
                />
                <motion.stop 
                  offset="1.0" 
                  animate={{ 
                    stopColor: state === FrogState.ANGRY ? '#7f1d1d' : 
                               state === FrogState.SCARED ? '#fee2e2' : '#FDBA74' 
                  }} 
                />
              </linearGradient>
              
              <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
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
                @keyframes squish {
                  0%, 100% { transform: scale(1, 1) translateY(0); }
                  50% { transform: scale(1.03, 0.97) translateY(3px); }
                }
                @keyframes blink {
                  0%, 96%, 100% { transform: scaleY(1); }
                  98% { transform: scaleY(0.1); }
                }
                @keyframes shake {
                  0%, 100% { transform: translateX(0); }
                  25% { transform: translateX(-2px); }
                  75% { transform: translateX(2px); }
                }
                .frog-body-svg {
                  transform-origin: bottom center;
                  animation: squish 3.5s ease-in-out infinite;
                }
                .frog-angry-shake {
                  animation: shake 0.15s infinite;
                }
                .frog-pupil-svg {
                  transform-origin: center;
                  animation: blink 4.5s infinite;
                }
              `}</style>
            </defs>

            <g className={`frog-body-svg ${state === FrogState.ANGRY ? 'frog-angry-shake' : ''}`} filter="url(#softShadow)">
              {/* 身体主体 */}
              <path 
                d="M 45 75 A 32 32 0 1 1 90 60 Q 100 70 110 60 A 32 32 0 1 1 155 75 C 180 90 190 120 190 145 C 190 180 150 190 100 190 C 50 190 10 180 10 145 C 10 120 20 90 45 75 Z" 
                fill="url(#skinGradient)" 
                stroke={state === FrogState.ANGRY ? '#991b1b' : '#22C55E'} 
                strokeWidth="1.5" 
                strokeLinejoin="round"
              />

              {/* 左眼 */}
              <g transform="translate(60, 45)">
                <circle cx="0" cy="0" r="24" fill="#FEF9C3" stroke="#D9F99D" strokeWidth="1"/>
                <g className="frog-pupil-svg">
                  <motion.circle 
                    cx="0" cy="0" r="16" fill="#1F2937"
                    animate={{
                      scale: state === FrogState.EXCITED ? 1.2 : 
                             state === FrogState.SCARED ? 0.7 : 1
                    }}
                  />
                  <circle cx="-5" cy="-5" r="5" fill="white" opacity="0.9"/>
                </g>
              </g>
              
              {/* 右眼 */}
              <g transform="translate(140, 45)">
                <circle cx="0" cy="0" r="24" fill="#FEF9C3" stroke="#D9F99D" strokeWidth="1"/>
                <g className="frog-pupil-svg">
                  <motion.circle 
                    cx="0" cy="0" r="16" fill="#1F2937"
                    animate={{
                      scale: state === FrogState.EXCITED ? 1.2 : 
                             state === FrogState.SCARED ? 0.7 : 1
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

              {/* 愤怒眉毛 */}
              <AnimatePresence>
                {state === FrogState.ANGRY && (
                  <motion.g
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    stroke="#15803D"
                    strokeWidth="4"
                    strokeLinecap="round"
                  >
                    <line x1="45" y1="35" x2="75" y2="50" />
                    <line x1="155" y1="35" x2="125" y2="50" />
                  </motion.g>
                )}
              </AnimatePresence>

              {/* 动态嘴巴 */}
              <path
                d={state === FrogState.HAPPY || state === FrogState.EATING || state === FrogState.LOVE
                    ? "M 80 130 Q 100 150 120 130"
                    : state === FrogState.SCARED || state === FrogState.ANGRY
                    ? "M 85 140 Q 100 135 115 140"
                    : "M 90 135 Q 100 138 110 135"
                }
                stroke="#15803D"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
                 
              {/* 愤怒符号 💢 */}
              <AnimatePresence>
                {state === FrogState.ANGRY && (
                  <motion.g
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ 
                      scale: [0, 1.2, 1], 
                      opacity: 1,
                      rotate: [0, -10, 10, 0] 
                    }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    transform="translate(170, 45)"
                  >
                    <path d="M-10 -5 L-2 -5 L-2 -13 M10 5 L2 5 L2 13 M-5 10 L-5 2 L-13 2 M5 -10 L5 -2 L13 -2" 
                      stroke="#ef4444" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </motion.g>
                )}
              </AnimatePresence>
                 
              {/* Zeta 标志 */}
              <path d="M96 152 L104 152 L96 160 L104 160" stroke="#15803D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
            </g>
          </svg>
        </div>
        
        {/* 配件层 */}
        <FrogAccessories state={state} />
      </motion.div>
      
      {/* 粒子效果 */}
      <AnimatePresence>
        {particles && (
          <ParticleEffect 
            type={particles as any} 
            onComplete={() => setParticles(null)}
          />
        )}
      </AnimatePresence>
      
      {/* 对话气泡 */}
      <AnimatePresence>
        {showSpeech && (
          <SpeechBubble 
            text={speechText} 
            position="top"
            onClose={() => setShowSpeech(false)}
          />
        )}
      </AnimatePresence>
      
      {/* 链上事件气泡 - 已暂时注释 */}
      {/* <AnimatePresence>
        {latestEvent && (
          <ChainEventBubble 
            event={latestEvent}
            onClose={() => {}}
          />
        )}
      </AnimatePresence> */}
      
      {/* 右键菜单 */}
      <AnimatePresence>
        {showContextMenu && (
          <motion.div
            className="absolute z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[150px]"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{
              left: contextMenuPosition.x,
              top: contextMenuPosition.y,
            }}
          >
            <button
              onClick={() => handleContextMenuAction('chat')}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
            >
              <span>💬</span>
              <span>开始聊天</span>
            </button>
            <button
              onClick={() => handleContextMenuAction('newPet')}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
            >
              <span>🐸</span>
              <span>新建青蛙</span>
            </button>
            <button
              onClick={() => handleContextMenuAction('saveState')}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
            >
              <span>💾</span>
              <span>保存状态</span>
            </button>
            <hr className="my-1 border-gray-200" />
            <button
              onClick={() => handleContextMenuAction('hide')}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
            >
              <span>👁️</span>
              <span>隐藏</span>
            </button>
            <button
              onClick={() => handleContextMenuAction('close')}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-red-600"
            >
              <span>❌</span>
              <span>关闭</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 聊天窗口 - 显示在页面中部 */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            className="fixed z-50"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <ChatBubble
              frogId={frogId}
              frogName={name}
              personality="COMEDIAN"
              onClose={() => setShowChat(false)}
              onClickOutside={() => setShowChat(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// 青蛙眼睛组件 (已由 SVG 内置，保留类型定义但移除引用)

// 配件组件
function FrogAccessories({ state }: { state: FrogState }) {
  return (
    <>
      {/* 旅行背包 */}
      {state === FrogState.TRAVELING && (
        <motion.div
          className="absolute -right-2 top-1/2 text-2xl"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          🎒
        </motion.div>
      )}
      
      {/* 返程纪念品 */}
      {state === FrogState.RETURNING && (
        <motion.div
          className="absolute -left-2 top-1/3 text-xl"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          🎁
        </motion.div>
      )}
      
      {/* 写日记的笔 */}
      {state === FrogState.WRITING && (
        <motion.div
          className="absolute -right-4 top-1/3 text-xl"
          animate={{ rotate: [0, -15, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          ✏️
        </motion.div>
      )}
      
      {/* 睡帽 */}
      {state === FrogState.SLEEPING && (
        <motion.div
          className="absolute -top-4 left-1/2 -translate-x-1/2 text-2xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          🧢
        </motion.div>
      )}
      
      {/* 发财墨镜 */}
      {state === FrogState.RICH && (
        <motion.div
          className="absolute top-[25%] left-1/2 -translate-x-1/2 text-2xl"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          😎
        </motion.div>
      )}
    </>
  );
}



// 辅助函数
function formatAmount(amount: number): string {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  return amount.toFixed(2);
}
