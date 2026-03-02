import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Frog from './components/Frog/Frog';
import StatusBar from './components/Frog/StatusBar';
import InteractionBubble from './components/Frog/InteractionBubble';
import QuickMenu from './components/Frog/QuickMenu';
import WeatherEffect from './components/WeatherEffect';
import HaloMenu from './components/HaloMenu/HaloMenu';
import TasksDialog from './components/Dialogs/TasksDialog';
import FriendsDialog from './components/Dialogs/FriendsDialog';
import BadgesDialog from './components/Dialogs/BadgesDialog';
import TravelDialog from './components/Dialogs/TravelDialog';
import SettingsDialog from './components/Dialogs/SettingsDialog';
import ChainMonitorPanel from './components/Dialogs/ChainMonitorPanel';
import HomeDialog from './components/Dialogs/HomeDialog';
import BagDialog from './components/Dialogs/BagDialog';
import { useFrogState } from './hooks/useFrogState';
import { useLifeCycle } from './hooks/useLifeCycle';
import { useChainMonitor } from './hooks/useChainMonitor';
import { useMemory } from './hooks/useMemory';
import { useTimeSystem } from './hooks/useTimeSystem';
import './styles/global.css';

declare global {
  interface Window {
    electronAPI?: {
      getWindowPosition: () => Promise<[number, number] | null>;
      setWindowPosition: (x: number, y: number) => Promise<void>;
      minimizeWindow: () => Promise<void>;
      closeWindow: () => Promise<void>;
      setClickThrough: (enabled: boolean) => Promise<void>;
      moveWindow: (x: number, y: number) => Promise<void>;
      onMenuAction: (callback: (action: string) => void) => void;
      platform: string;
    };
  }
}

function App() {
  const [showMenu, setShowMenu] = useState(false);
  const [pokeCount, setPokeCount] = useState(0);
  const [lastInteractTime, setLastInteractTime] = useState(Date.now());
  const [isPatrolling, setIsPatrolling] = useState(false);
  
  // Bubble
  const [bubbleMessage, setBubbleMessage] = useState('');
  const [showBubble, setShowBubble] = useState(false);
  const [quickMenu, setQuickMenu] = useState({ visible: false, x: 0, y: 0 });
  
  const [dialogs, setDialogs] = useState({
    tasks: false, friends: false, badges: false, travel: false,
    home: false, bag: false, settings: false, chainMonitor: false,
  });
  
  const [walletAddress] = useState('0x1234567890abcdef1234567890abcdef12345678');
  const [tokenId] = useState(1);
  
  const frogState = useFrogState();
  useLifeCycle(frogState);
  const chainMonitor = useChainMonitor(frogState);
  const { remember } = useMemory();
  const timeSystem = useTimeSystem();

  // Show interaction bubble
  const showInteractionBubble = useCallback((message: string) => {
    setBubbleMessage(message);
    setShowBubble(true);
  }, []);

  // Time-based greeting
  useEffect(() => {
    if (frogState.currentState === 'idle' && Math.random() > 0.7) {
      showInteractionBubble(timeSystem.getGreeting());
    }
  }, [timeSystem.timeOfDay]);

  useEffect(() => {
    if (window.electronAPI?.onMenuAction) {
      window.electronAPI.onMenuAction((action: string) => handleMenuAction(action));
    }
  }, []);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      setQuickMenu({ visible: true, x: e.clientX, y: e.clientY });
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  const handleMenuAction = useCallback((action: string) => {
    switch (action) {
      case 'travel': setDialogs(d => ({ ...d, travel: true })); break;
      case 'bag': setDialogs(d => ({ ...d, bag: true })); break;
      case 'friends': setDialogs(d => ({ ...d, friends: true })); break;
      case 'badges': setDialogs(d => ({ ...d, badges: true })); break;
      case 'home': setDialogs(d => ({ ...d, home: true })); break;
      case 'settings': setDialogs(d => ({ ...d, settings: true })); break;
      case 'monitor': setDialogs(d => ({ ...d, chainMonitor: true })); break;
    }
  }, []);

  useEffect(() => setLastInteractTime(Date.now()), [frogState.currentState]);

  const handleFrogClick = useCallback((area: string) => {
    if (pokeCount > 0 && Date.now() - lastInteractTime > 3000) setPokeCount(0);
    switch (area) {
      case 'head': 
        frogState.interact('pet'); 
        showInteractionBubble('好舒服呀～');
        remember('interaction', 'pet', 0.7);
        break;
      case 'body': 
        setPokeCount(p => p + 1); 
        frogState.interact('poke'); 
        showInteractionBubble('哎呀！');
        if (pokeCount >= 3) {
          frogState.setAngry();
          showInteractionBubble('哼！');
        }
        break;
      case 'mouth': 
        frogState.interact('feed'); 
        showInteractionBubble('好吃！');
        remember('interaction', 'feed', 0.6);
        break;
    }
  }, [frogState, pokeCount, lastInteractTime, showInteractionBubble, remember]);

  const handleDragEnd = useCallback((x: number, y: number) => {
    frogState.setPosition(x, y);
    window.electronAPI?.moveWindow(x, y);
  }, [frogState]);

  const handlePatrolToggle = useCallback(() => {
    if (isPatrolling) {
      frogState.stopPatrol();
      setIsPatrolling(false);
      showInteractionBubble('巡逻结束');
    } else {
      frogState.startPatrol();
      setIsPatrolling(true);
      showInteractionBubble('开始巡逻！');
    }
  }, [isPatrolling, frogState, showInteractionBubble]);

  const handleMenuSelect = useCallback((item: string) => { 
    if (item === 'patrol') {
      handlePatrolToggle();
    } else if (item === 'sleep') {
      frogState.setCurrentState('sleeping');
      showInteractionBubble('晚安～');
    } else {
      handleMenuAction(item); 
    }
    setShowMenu(false); 
  }, [handlePatrolToggle, handleMenuAction, frogState, showInteractionBubble]);

  const handleQuickMenuSelect = useCallback((action: string) => {
    switch (action) {
      case 'pet': frogState.interact('pet'); showInteractionBubble('好舒服呀～'); break;
      case 'feed': frogState.interact('feed'); showInteractionBubble('好吃！'); break;
      case 'patrol': handlePatrolToggle(); break;
      case 'travel': setDialogs(d => ({ ...d, travel: true })); break;
      case 'sleep': frogState.setCurrentState('sleeping'); showInteractionBubble('晚安～'); break;
    }
  }, [frogState, handlePatrolToggle, showInteractionBubble]);

  const closeDialog = (name: string) => setDialogs(d => ({ ...d, [name]: false }));
  const handleTravelStart = (chain: string, duration: number) => { 
    frogState.setCurrentState('traveling'); 
    showInteractionBubble('出发去旅行！');
  };

  return (
    <div style={{ width: '100%', height: '100%', background: 'transparent', position: 'relative' }}>
      {/* Weather effect */}
      <WeatherEffect weather={timeSystem.weather} />
      
      <StatusBar hunger={frogState.stats.hunger} energy={frogState.stats.energy} happiness={frogState.stats.happiness} />
      
      <Frog state={frogState.currentState} mood={frogState.mood} stats={frogState.stats} onClick={handleFrogClick} onDragStart={() => {}} onDragEnd={handleDragEnd} />
      
      <InteractionBubble message={bubbleMessage} visible={showBubble} onHide={() => setShowBubble(false)} />
      
      <QuickMenu visible={quickMenu.visible} x={quickMenu.x} y={quickMenu.y} onSelect={handleQuickMenuSelect} onClose={() => setQuickMenu({ ...quickMenu, visible: false })} />
      
      <HaloMenu visible={showMenu} onSelect={handleMenuSelect} onClose={() => setShowMenu(false)} />
      
      <motion.div style={{ position: 'absolute', bottom: 8, right: 8, fontSize: 10, opacity: 0.5, color: 'white', cursor: 'pointer', textAlign: 'center' }} whileHover={{ scale: 1.1 }} onClick={() => setShowMenu(!showMenu)}>
        <div>🐸</div>
        <div>{showMenu ? '关闭' : '菜单'}</div>
      </motion.div>

      <motion.div style={{ position: 'absolute', bottom: 8, left: 8, fontSize: 9, color: 'rgba(255,255,255,0.5)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={frogState.currentState}>
        {frogState.currentState === 'idle' && '🐸'}
        {frogState.currentState === 'sleeping' && '😴'}
        {frogState.currentState === 'eating' && '🍽️'}
        {frogState.currentState === 'happy' && '😊'}
        {frogState.currentState === 'excited' && '🎉'}
        {frogState.currentState === 'scared' && '😨'}
        {frogState.currentState === 'dancing' && '💃'}
        {frogState.currentState === 'crying' && '😭'}
        {frogState.currentState === 'traveling' && '🎒'}
        {frogState.currentState === 'thinking' && '💭'}
        {frogState.currentState === 'angry' && '😠'}
        {frogState.currentState === 'stretching' && '🧘'}
        {frogState.currentState === 'yawning' && '😴'}
        {frogState.currentState === 'looking' && '👀'}
        {frogState.currentState === 'greeting' && '👋'}
        {frogState.currentState === 'walking' && '🚶'}
        {frogState.currentState === 'patrolling' && '🎯'}
      </motion.div>

      <TasksDialog walletAddress={walletAddress} visible={dialogs.tasks} onClose={() => closeDialog('tasks')} />
      <FriendsDialog walletAddress={walletAddress} visible={dialogs.friends} onClose={() => closeDialog('friends')} />
      <BadgesDialog tokenId={tokenId} visible={dialogs.badges} onClose={() => closeDialog('badges')} />
      <TravelDialog tokenId={tokenId} visible={dialogs.travel} onClose={() => closeDialog('travel')} onTravelStart={handleTravelStart} />
      <SettingsDialog visible={dialogs.settings} onClose={() => closeDialog('settings')} />
      <ChainMonitorPanel visible={dialogs.chainMonitor} onClose={() => closeDialog('chainMonitor')} onSimulate={(e) => chainMonitor.simulateEvent(e as any)} />
      <HomeDialog tokenId={tokenId} visible={dialogs.home} onClose={() => closeDialog('home')} />
      <BagDialog visible={dialogs.bag} onClose={() => closeDialog('bag')} />
    </div>
  );
}

export default App;
