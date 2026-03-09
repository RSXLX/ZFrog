import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

// Components
import Frog from './components/Frog/Frog';
import StatusBar from './components/Frog/StatusBar';
import InteractionBubble from './components/Frog/InteractionBubble';
import QuickMenu from './components/Frog/QuickMenu';
import WeatherEffect from './components/WeatherEffect';
import HaloMenu from './components/HaloMenu/HaloMenu';

// Dialogs
import TasksDialog from './components/Dialogs/TasksDialog';
import FriendsDialog from './components/Dialogs/FriendsDialog';
import BadgesDialog from './components/Dialogs/BadgesDialog';
import TravelDialog from './components/Dialogs/TravelDialog';
import SettingsDialog from './components/Dialogs/SettingsDialog';
import ChainMonitorPanel from './components/Dialogs/ChainMonitorPanel';
import HomeDialog from './components/Dialogs/HomeDialog';
import BagDialog from './components/Dialogs/BagDialog';
import ProfileDialog from './components/Dialogs/ProfileDialog';
import QuietModePanel from '../components/QuietModePanel';

// Hooks
import { useFrogState } from './hooks/useFrogState';
import { useLifeCycle } from './hooks/useLifeCycle';
import { useChainMonitor } from './hooks/useChainMonitor';
import { useMemory } from './hooks/useMemory';
import { useTimeSystem } from './hooks/useTimeSystem';
import { useAchievements } from './hooks/useAchievements';
import { useInventory } from './hooks/useInventory';
import { useSocial } from './hooks/useSocial';
import { useTravel } from './hooks/useTravel';
import { usePetStats } from './hooks/usePetStats';
import { useDailyTasks } from './hooks/useDailyTasks';
import { useSound } from './hooks/useSound';
import { useQuietMode } from './hooks/useQuietMode';

// Styles
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
  // State
  const [showMenu, setShowMenu] = useState(false);
  const [pokeCount, setPokeCount] = useState(0);
  const [lastInteractTime, setLastInteractTime] = useState(Date.now());
  const [isPatrolling, setIsPatrolling] = useState(false);
  
  // UI State
  const [bubbleMessage, setBubbleMessage] = useState('');
  const [showBubble, setShowBubble] = useState(false);
  const [quickMenu, setQuickMenu] = useState({ visible: false, x: 0, y: 0 });
  
  // Dialogs State
  const [dialogs, setDialogs] = useState({
    tasks: false,
    friends: false,
    badges: false,
    travel: false,
    home: false,
    bag: false,
    settings: false,
    chainMonitor: false,
    profile: false,
    quietMode: false,
  });
  
  // Mock Data
  const [walletAddress] = useState('0x1234567890abcdef1234567890abcdef12345678');
  const [tokenId] = useState(1);
  
  // Hooks
  const frogState = useFrogState();
  useLifeCycle(frogState);
  const chainMonitor = useChainMonitor(frogState);
  const { remember } = useMemory();
  const timeSystem = useTimeSystem();
  const achievements = useAchievements();
  const inventory = useInventory();
  const social = useSocial();
  const travel = useTravel();
  const petStats = usePetStats();
  const dailyTasks = useDailyTasks();
  const { play: playSound } = useSound();
  const quietMode = useQuietMode();

  // Quiet Mode Effect
  useEffect(() => {
    if (quietMode.behavior.frogState === 'sleeping') {
      frogState.setCurrentState('sleeping');
    } else if (quietMode.behavior.frogState === 'hidden') {
      // Handle hidden state
    } else if (frogState.currentState === 'sleeping' && quietMode.behavior.frogState !== 'sleeping') {
      frogState.setCurrentState('idle');
    }
  }, [quietMode.behavior.frogState, frogState]);

  // Show interaction bubble
  const showInteractionBubble = useCallback((message: string) => {
    setBubbleMessage(message);
    setShowBubble(true);
  }, []);

  // Play sound on interaction
  const handleInteraction = useCallback((type: 'pet' | 'poke' | 'feed') => {
    if (quietMode.behavior.playSounds) {
      playSound(type);
    }
  }, [playSound, quietMode.behavior.playSounds]);

  // Time-based greeting
  useEffect(() => {
    if (frogState.currentState === 'idle' && Math.random() > 0.7 && quietMode.behavior.showAnimations) {
      showInteractionBubble(timeSystem.getGreeting());
    }
  }, [timeSystem.timeOfDay, frogState.currentState, quietMode.behavior.showAnimations, showInteractionBubble, timeSystem]);

  // Electron API setup
  useEffect(() => {
    if (window.electronAPI?.onMenuAction) {
      window.electronAPI.onMenuAction((action: string) => handleMenuAction(action));
    }
  }, []);

  // Context menu setup
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      setQuickMenu({ visible: true, x: e.clientX, y: e.clientY });
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  // Menu action handler
  const handleMenuAction = useCallback((action: string) => {
    switch (action) {
      case 'travel': setDialogs(d => ({ ...d, travel: true })); break;
      case 'bag': setDialogs(d => ({ ...d, bag: true })); break;
      case 'friends': setDialogs(d => ({ ...d, friends: true })); break;
      case 'badges': setDialogs(d => ({ ...d, badges: true })); break;
      case 'home': setDialogs(d => ({ ...d, home: true })); break;
      case 'settings': setDialogs(d => ({ ...d, settings: true })); break;
      case 'monitor': setDialogs(d => ({ ...d, chainMonitor: true })); break;
      case 'profile': setDialogs(d => ({ ...d, profile: true })); break;
      case 'quiet': setDialogs(d => ({ ...d, quietMode: true })); break;
    }
  }, []);

  // Update last interact time
  useEffect(() => setLastInteractTime(Date.now()), [frogState.currentState]);

  // Handle frog click
  const handleFrogClick = useCallback((area: string) => {
    if (!quietMode.behavior.allowInteraction) return;
    
    if (pokeCount > 0 && Date.now() - lastInteractTime > 3000) setPokeCount(0);
    
    switch (area) {
      case 'head':
        frogState.interact('pet');
        handleInteraction('pet');
        showInteractionBubble('好舒服呀～');
        remember('interaction', 'pet', 0.7);
        petStats.addExp(5);
        dailyTasks.completeTask('1');
        achievements.incrementProgress('first_pet');
        achievements.incrementProgress('pet_50');
        break;
      case 'body':
        setPokeCount(p => p + 1);
        frogState.interact('poke');
        handleInteraction('poke');
        showInteractionBubble('哎呀！');
        if (pokeCount >= 3) {
          frogState.setAngry();
          showInteractionBubble('哼！');
        }
        break;
      case 'mouth':
        frogState.interact('feed');
        handleInteraction('feed');
        showInteractionBubble('好吃！');
        remember('interaction', 'feed', 0.6);
        petStats.increaseStat('hunger', 15);
        petStats.addExp(3);
        dailyTasks.completeTask('1');
        achievements.incrementProgress('feed_10');
        break;
    }
  }, [frogState, pokeCount, lastInteractTime, quietMode.behavior.allowInteraction, handleInteraction, showInteractionBubble, remember, petStats, dailyTasks, achievements]);

  // Handle drag end
  const handleDragEnd = useCallback((x: number, y: number) => {
    frogState.setPosition(x, y);
    window.electronAPI?.moveWindow(x, y);
  }, [frogState]);

  // Handle patrol toggle
  const handlePatrolToggle = useCallback(() => {
    if (isPatrolling) {
      frogState.stopPatrol();
      setIsPatrolling(false);
      showInteractionBubble('巡逻结束');
      dailyTasks.completeTask('3');
    } else {
      frogState.startPatrol();
      setIsPatrolling(true);
      showInteractionBubble('开始巡逻！');
    }
  }, [isPatrolling, frogState, showInteractionBubble, dailyTasks]);

  // Handle menu select
  const handleMenuSelect = useCallback((item: string) => {
    if (item === 'patrol') {
      handlePatrolToggle();
    } else if (item === 'sleep') {
      frogState.setCurrentState('sleeping');
      showInteractionBubble('晚安～');
    } else if (item === 'profile') {
      setDialogs(d => ({ ...d, profile: true }));
    } else {
      handleMenuAction(item);
    }
    setShowMenu(false);
  }, [handlePatrolToggle, handleMenuAction, frogState, showInteractionBubble]);

  // Handle quick menu select
  const handleQuickMenuSelect = useCallback((action: string) => {
    switch (action) {
      case 'pet':
        frogState.interact('pet');
        showInteractionBubble('好舒服呀～');
        break;
      case 'feed':
        frogState.interact('feed');
        showInteractionBubble('好吃！');
        break;
      case 'patrol':
        handlePatrolToggle();
        break;
      case 'travel':
        setDialogs(d => ({ ...d, travel: true }));
        break;
      case 'sleep':
        frogState.setCurrentState('sleeping');
        showInteractionBubble('晚安～');
        break;
    }
  }, [frogState, handlePatrolToggle, showInteractionBubble]);

  // Close dialog helper
  const closeDialog = (name: string) => setDialogs(d => ({ ...d, [name]: false }));

  // Handle travel start
  const handleTravelStart = (chain: string, duration: number) => {
    frogState.setCurrentState('traveling');
    showInteractionBubble('出发去旅行！');
    travel.startTravel(travel.destinations.find(d => d.chain === chain) || travel.destinations[0]);
    dailyTasks.completeTask('4');
    achievements.incrementProgress('travel_3');
  };

  return (
    <div style={{ width: '100%', height: '100%', background: 'transparent', position: 'relative' }}>
      {/* Weather Effect */}
      <WeatherEffect weather={timeSystem.weather} />

      {/* Status Bar */}
      <StatusBar hunger={petStats.stats.hunger} energy={petStats.stats.energy} happiness={petStats.stats.happiness} />

      {/* Frog */}
      <Frog state={frogState.currentState} mood={frogState.mood} stats={petStats.stats} onClick={handleFrogClick} onDragStart={() => {}} onDragEnd={handleDragEnd} />

      {/* Interaction Bubble */}
      <InteractionBubble message={bubbleMessage} visible={showBubble} onHide={() => setShowBubble(false)} />

      {/* Quick Menu */}
      <QuickMenu visible={quickMenu.visible} x={quickMenu.x} y={quickMenu.y} onSelect={handleQuickMenuSelect} onClose={() => setQuickMenu({ ...quickMenu, visible: false })} />

      {/* Halo Menu */}
      <HaloMenu visible={showMenu} onSelect={handleMenuSelect} onClose={() => setShowMenu(false)} />

      {/* Menu Button */}
      <motion.div style={{ position: 'absolute', bottom: 8, right: 8, fontSize: 10, opacity: 0.5, color: 'white', cursor: 'pointer', textAlign: 'center' }} whileHover={{ scale: 1.1 }} onClick={() => setShowMenu(!showMenu)}>
        <div>🐸</div>
        <div>{showMenu ? '关闭' : '菜单'}</div>
      </motion.div>

      {/* Status Indicator */}
      <motion.div style={{ position: 'absolute', bottom: 8, left: 8, fontSize: 9, color: 'rgba(255,255,255,0.5)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={frogState.currentState}>
        {frogState.currentState === 'idle' && '🐸 Lv.' + petStats.stats.level}
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

      {/* Dialogs */}
      <TasksDialog walletAddress={walletAddress} visible={dialogs.tasks} onClose={() => closeDialog('tasks')} tasks={dailyTasks.tasks} />
      <FriendsDialog walletAddress={walletAddress} visible={dialogs.friends} onClose={() => closeDialog('friends')} friends={social.friends} />
      <BadgesDialog tokenId={tokenId} visible={dialogs.badges} onClose={() => closeDialog('badges')} achievements={achievements.achievements} />
      <TravelDialog tokenId={tokenId} visible={dialogs.travel} onClose={() => closeDialog('travel')} onTravelStart={handleTravelStart} travel={travel} />
      <SettingsDialog visible={dialogs.settings} onClose={() => closeDialog('settings')} />
      <ChainMonitorPanel visible={dialogs.chainMonitor} onClose={() => closeDialog('chainMonitor')} onSimulate={(e) => chainMonitor.simulateEvent(e as any)} />
      <HomeDialog tokenId={tokenId} visible={dialogs.home} onClose={() => closeDialog('home')} />
      <BagDialog visible={dialogs.bag} onClose={() => closeDialog('bag')} inventory={inventory} />
      <ProfileDialog visible={dialogs.profile} onClose={() => closeDialog('profile')} petData={petStats.stats} />
      <QuietModePanel visible={dialogs.quietMode} onClose={() => closeDialog('quietMode')} />
    </div>
  );
}

export default App;
