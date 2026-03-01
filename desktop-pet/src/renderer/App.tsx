import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Frog from './components/Frog/Frog';
import StatusBar from './components/Frog/StatusBar';
import HaloMenu from './components/HaloMenu/HaloMenu';
import TasksDialog from './components/Dialogs/TasksDialog';
import FriendsDialog from './components/Dialogs/FriendsDialog';
import BadgesDialog from './components/Dialogs/BadgesDialog';
import TravelDialog from './components/Dialogs/TravelDialog';
import SettingsDialog from './components/Dialogs/SettingsDialog';
import ChainMonitorPanel from './components/Dialogs/ChainMonitorPanel';
import HomeDialog from './components/Dialogs/HomeDialog';
import { useFrogState } from './hooks/useFrogState';
import { useLifeCycle } from './hooks/useLifeCycle';
import { useChainMonitor } from './hooks/useChainMonitor';

declare global {
  interface Window {
    electronAPI?: {
      getWindowPosition: () => Promise<[number, number] | null>;
      setWindowPosition: (x: number, y: number) => Promise<void>;
      minimizeWindow: () => Promise<void>;
      closeWindow: () => Promise<void>;
      onMenuAction: (callback: (action: string) => void) => void;
      platform: string;
    };
  }
}

function App() {
  const [showMenu, setShowMenu] = useState(false);
  const [pokeCount, setPokeCount] = useState(0);
  const [lastInteractTime, setLastInteractTime] = useState(Date.now());
  
  // Dialog states
  const [dialogs, setDialogs] = useState({
    tasks: false,
    friends: false,
    badges: false,
    travel: false,
    home: false,
    settings: false,
    chainMonitor: false,
    home: false,
  });
  
  // Mock wallet address
  const [walletAddress] = useState('0x1234567890abcdef1234567890abcdef12345678');
  const [tokenId] = useState(1);
  
  const frogState = useFrogState();
  useLifeCycle(frogState);
  const chainMonitor = useChainMonitor(frogState);

  // Handle menu actions
  useEffect(() => {
    if (window.electronAPI?.onMenuAction) {
      window.electronAPI.onMenuAction((action: string) => {
        handleMenuAction(action);
      });
    }
  }, []);

  const handleMenuAction = useCallback((action: string) => {
    console.log('[App] Menu action:', action);
    switch (action) {
      case 'travel':
        setDialogs(prev => ({ ...prev, travel: true }));
        break;
      case 'bag':
        break;
      case 'friends':
        setDialogs(prev => ({ ...prev, friends: true }));
        break;
      case 'badges':
        setDialogs(prev => ({ ...prev, badges: true }));
        break;
      case 'home':
        setDialogs(prev => ({ ...prev, home: true }));
        break;
      case 'settings':
        setDialogs(prev => ({ ...prev, settings: true }));
        break;
      case 'monitor':
        setDialogs(prev => ({ ...prev, chainMonitor: true }));
        break;
      default:
        break;
    }
  }, []);

  useEffect(() => {
    setLastInteractTime(Date.now());
  }, [frogState.currentState]);

  const handleFrogClick = useCallback((area: string) => {
    console.log('[App] Frog clicked:', area);
    
    if (pokeCount > 0 && Date.now() - lastInteractTime > 3000) {
      setPokeCount(0);
    }
    
    switch (area) {
      case 'head':
        frogState.interact('pet');
        break;
      case 'body':
        setPokeCount(prev => prev + 1);
        frogState.interact('poke');
        if (pokeCount >= 3) {
          frogState.setAngry();
        }
        break;
      case 'mouth':
        frogState.interact('feed');
        break;
      default:
        break;
    }
  }, [frogState, pokeCount, lastInteractTime]);

  const handleDragEnd = useCallback((x: number, y: number) => {
    if (window.electronAPI?.setWindowPosition) {
      window.electronAPI.setWindowPosition(x - 150, y - 150);
    }
  }, []);

  const handleMenuSelect = useCallback((item: string) => {
    handleMenuAction(item);
    setShowMenu(false);
  }, [handleMenuAction]);

  const closeDialog = (dialogName: keyof typeof dialogs) => {
    setDialogs(prev => ({ ...prev, [dialogName]: false }));
  };

  const handleTravelStart = (chain: string, duration: number) => {
    console.log('[App] Starting travel:', chain, duration);
    frogState.setCurrentState('traveling');
  };

  const handleSimulateEvent = (eventType: string) => {
    chainMonitor.simulateEvent(eventType as any);
  };

  return (
    <div className="frog-container">
      <StatusBar 
        hunger={frogState.stats.hunger}
        energy={frogState.stats.energy}
        happiness={frogState.stats.happiness}
      />
      
      <Frog 
        state={frogState.currentState}
        mood={frogState.mood}
        stats={frogState.stats}
        onClick={handleFrogClick}
        onDragStart={() => console.log('[App] Drag start')}
        onDragEnd={handleDragEnd}
      />
      
      <HaloMenu 
        visible={showMenu}
        onSelect={handleMenuSelect}
        onClose={() => setShowMenu(false)}
      />
      
      <motion.div
        style={{ 
          position: 'absolute', 
          bottom: 10, 
          right: 15,
          fontSize: 11,
          opacity: 0.6,
          color: 'white',
          cursor: 'pointer',
          textAlign: 'center'
        }}
        whileHover={{ scale: 1.1 }}
        onClick={() => setShowMenu(!showMenu)}
      >
        <div>🐸</div>
        <div>{showMenu ? '关闭' : '菜单'}</div>
      </motion.div>

      <motion.div
        style={{
          position: 'absolute',
          bottom: 10,
          left: 15,
          fontSize: 10,
          color: 'rgba(255,255,255,0.6)'
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        key={frogState.currentState}
      >
        {frogState.currentState === 'idle' && '🐸 等待中...'}
        {frogState.currentState === 'sleeping' && '😴 睡觉中'}
        {frogState.currentState === 'eating' && '🍽️ 吃东西'}
        {frogState.currentState === 'happy' && '😊 开心'}
        {frogState.currentState === 'excited' && '🎉 兴奋！'}
        {frogState.currentState === 'scared' && '😨 害怕'}
        {frogState.currentState === 'dancing' && '💃 跳舞中'}
        {frogState.currentState === 'crying' && '😭 哭泣中'}
        {frogState.currentState === 'traveling' && '🎒 旅行中'}
        {frogState.currentState === 'thinking' && '💭 思考中'}
        {frogState.currentState === 'angry' && '😠 生气中'}
      </motion.div>

      {/* Dialogs */}
      <TasksDialog 
        walletAddress={walletAddress}
        visible={dialogs.tasks}
        onClose={() => closeDialog('tasks')}
      />
      
      <FriendsDialog 
        walletAddress={walletAddress}
        visible={dialogs.friends}
        onClose={() => closeDialog('friends')}
      />
      
      <BadgesDialog 
        tokenId={tokenId}
        visible={dialogs.badges}
        onClose={() => closeDialog('badges')}
      />
      
      <TravelDialog 
        tokenId={tokenId}
        visible={dialogs.travel}
        onClose={() => closeDialog('travel')}
        onTravelStart={handleTravelStart}
      />
      
      <SettingsDialog 
        visible={dialogs.settings}
        onClose={() => closeDialog('settings')}
      />
      
      <HomeDialog 
        tokenId={tokenId}
        visible={dialogs.home}
        onClose={() => closeDialog('home')}
      />
      <ChainMonitorPanel 
        visible={dialogs.chainMonitor}
        onClose={() => closeDialog('chainMonitor')}
        onSimulate={handleSimulateEvent}
      />
    </div>
  );
}

export default App;
