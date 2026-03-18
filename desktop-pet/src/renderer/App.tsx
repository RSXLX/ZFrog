import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';

import Frog from './components/Frog/Frog';
import StatusBar from './components/Frog/StatusBar';
import InteractionBubble from './components/Frog/InteractionBubble';
import QuickMenu from './components/Frog/QuickMenu';
import WeatherEffect from './components/WeatherEffect';
import HaloMenu from './components/HaloMenu/HaloMenu';
import { HibernationStatus } from './components/HibernationStatus';

import TasksDialog from './components/Dialogs/TasksDialog';
import FriendsDialog from './components/Dialogs/FriendsDialog';
import BadgesDialog from './components/Dialogs/BadgesDialog';
import TravelDialog from './components/Dialogs/TravelDialog';
import SettingsDialog from './components/Dialogs/SettingsDialog';
import ChainMonitorPanel from './components/Dialogs/ChainMonitorPanel';
import HomeDialog from './components/Dialogs/HomeDialog';
import BagDialog from './components/Dialogs/BagDialog';
import ProfileDialog from './components/Dialogs/ProfileDialog';
import CollectionDialog from './components/Dialogs/CollectionDialog';
import QuietModePanel from '../components/QuietModePanel';

import { useFrogState } from './hooks/useFrogState';
import { useLifeCycle } from './hooks/useLifeCycle';
import { useChainMonitor } from './hooks/useChainMonitor';
import { useMemory } from './hooks/useMemory';
import { useTimeSystem } from './hooks/useTimeSystem';
import { useAchievements } from './hooks/useAchievements';
import { useInventory, type InventoryItem } from './hooks/useInventory';
import { useSocial } from './hooks/useSocial';
import { useTravel } from './hooks/useTravel';
import { usePetStats } from './hooks/usePetStats';
import { useDailyTasks } from './hooks/useDailyTasks';
import { useSound } from './hooks/useSound';
import { useHibernation } from './hooks/useHibernation';
import { useActivity } from './hooks/useActivity';
import { useCollectionBook } from './hooks/useCollectionBook';
import { useDecoration } from './hooks/useDecoration';
import { useLongTermGoals } from './hooks/useLongTermGoals';
import { useQuietMode } from '../hooks/useQuietMode';
import api from './services/api';
import storage from './services/storage';

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

const initialDialogs = {
  tasks: false,
  friends: false,
  badges: false,
  travel: false,
  home: false,
  collection: false,
  bag: false,
  settings: false,
  chainMonitor: false,
  profile: false,
  quietMode: false,
};

type DialogKey = keyof typeof initialDialogs;

function App() {
  const [showMenu, setShowMenu] = useState(false);
  const [pokeCount, setPokeCount] = useState(0);
  const [lastInteractTime, setLastInteractTime] = useState(Date.now());
  const [isPatrolling, setIsPatrolling] = useState(false);
  const [bubbleMessage, setBubbleMessage] = useState('');
  const [showBubble, setShowBubble] = useState(false);
  const [quickMenu, setQuickMenu] = useState({ visible: false, x: 0, y: 0 });
  const [dialogs, setDialogs] = useState(initialDialogs);
  const [walletAddress] = useState(() => storage.getWalletAddress() || '0x1234567890abcdef1234567890abcdef12345678');
  const [tokenId, setTokenId] = useState(1);
  const [petName, setPetName] = useState(() => {
    try {
      return localStorage.getItem('zfrog_pet_name') || '呱呱';
    } catch {
      return '呱呱';
    }
  });

  const loginCheckedRef = useRef(false);
  const handledMilestoneRef = useRef<string | null>(null);
  const travelReadyRef = useRef<string | null>(null);

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
  const activity = useActivity();
  const collectionBook = useCollectionBook();
  const decoration = useDecoration();
  const { hibernation, recordInteraction, wakeUp, isHibernating } = useHibernation(frogState);

  const taskProgress = dailyTasks.getProgress();
  const totalTaskReward = dailyTasks.getTotalReward();
  const decorationInventory = inventory.getItemsByType('decoration').filter(item => item.quantity > 0);
  const longTermGoals = useLongTermGoals({
    tasksCompleted: taskProgress.completed,
    tasksTotal: taskProgress.total,
    travelHistory: travel.travelHistory,
    placedDecorationTypes: decoration.decorations.map(item => item.itemId),
  });

  const showInteractionBubble = useCallback((message: string) => {
    setBubbleMessage(message);
    setShowBubble(true);
  }, []);

  const handleInteractionSound = useCallback((type: 'pet' | 'poke' | 'feed') => {
    if (quietMode.behavior.playSounds) {
      playSound(type);
    }
  }, [playSound, quietMode.behavior.playSounds]);

  const openDialog = useCallback((name: DialogKey) => {
    setDialogs(prev => ({ ...prev, [name]: true }));
  }, []);

  const closeDialog = useCallback((name: DialogKey) => {
    setDialogs(prev => ({ ...prev, [name]: false }));
  }, []);

  const applyItemEffect = useCallback((item: InventoryItem) => {
    if (item.effect?.hunger) {
      petStats.increaseStat('hunger', item.effect.hunger);
    }
    if (item.effect?.happiness) {
      petStats.increaseStat('happiness', item.effect.happiness);
    }
    if (item.effect?.energy) {
      petStats.increaseStat('energy', item.effect.energy);
    }
  }, [petStats]);

  const handleUseBagItem = useCallback((itemId: string) => {
    const item = inventory.useItem(itemId);
    if (!item) {
      showInteractionBubble('背包里已经没有这个道具了');
      return;
    }

    applyItemEffect(item);
    petStats.addExp(2);
    recordInteraction();
    showInteractionBubble(`${item.name} 已经用上啦`);
  }, [inventory, applyItemEffect, petStats, recordInteraction, showInteractionBubble]);

  const handlePlaceDecoration = useCallback((itemId: string) => {
    const item = inventory.items.find(entry => entry.id === itemId);
    if (!item || item.quantity <= 0) {
      showInteractionBubble('这个装饰暂时不在背包里');
      return;
    }

    inventory.removeItem(itemId, 1);
    decoration.placeDecoration(
      itemId,
      12 + Math.random() * 70,
      18 + Math.random() * 52,
      { scale: 0.9 + Math.random() * 0.3 }
    );
    recordInteraction();
    showInteractionBubble(`把 ${item.name} 摆进家园了`);
  }, [inventory, decoration, recordInteraction, showInteractionBubble]);

  const handleRemoveDecoration = useCallback((decorationId: string) => {
    const placed = decoration.decorations.find(item => item.id === decorationId);
    if (!placed) return;

    decoration.removeDecoration(decorationId);
    inventory.addItem(placed.itemId, 1);
    showInteractionBubble('先把它收回背包，等等再重新摆');
  }, [decoration, inventory, showInteractionBubble]);

  const performPetInteraction = useCallback(() => {
    frogState.interact('pet');
    handleInteractionSound('pet');
    showInteractionBubble('好舒服呀～');
    remember('interaction', 'pet', 0.7);
    petStats.addExp(5);
    dailyTasks.completeTask('2');
    achievements.incrementProgress('first_pet');
    achievements.incrementProgress('pet_50');
  }, [frogState, handleInteractionSound, showInteractionBubble, remember, petStats, dailyTasks, achievements]);

  const performFeedInteraction = useCallback(() => {
    frogState.interact('feed');
    handleInteractionSound('feed');
    showInteractionBubble('好吃！');
    remember('interaction', 'feed', 0.6);
    petStats.increaseStat('hunger', 15);
    petStats.addExp(3);
    dailyTasks.completeTask('1');
    achievements.incrementProgress('feed_10');
  }, [frogState, handleInteractionSound, showInteractionBubble, remember, petStats, dailyTasks, achievements]);

  const handleMenuAction = useCallback((action: string) => {
    if (isHibernating && action !== 'quiet' && action !== 'settings') {
      wakeUp();
      showInteractionBubble('先把它叫醒再说');
      return;
    }

    recordInteraction();

    switch (action) {
      case 'tasks':
        openDialog('tasks');
        break;
      case 'travel':
        openDialog('travel');
        break;
      case 'bag':
        openDialog('bag');
        break;
      case 'friends':
        openDialog('friends');
        dailyTasks.completeTask('5');
        break;
      case 'badges':
        openDialog('badges');
        break;
      case 'home':
        openDialog('home');
        break;
      case 'collection':
        openDialog('collection');
        break;
      case 'settings':
        openDialog('settings');
        break;
      case 'monitor':
        openDialog('chainMonitor');
        break;
      case 'profile':
        openDialog('profile');
        break;
      case 'quiet':
        openDialog('quietMode');
        break;
      default:
        break;
    }
  }, [isHibernating, wakeUp, showInteractionBubble, recordInteraction, openDialog, dailyTasks]);

  useEffect(() => {
    if (quietMode.behavior.frogState === 'sleeping') {
      frogState.setCurrentState('sleeping');
    } else if (frogState.currentState === 'sleeping' && quietMode.behavior.frogState !== 'sleeping') {
      frogState.setCurrentState('idle');
    }
  }, [quietMode.behavior.frogState, frogState]);

  useEffect(() => {
    if (frogState.currentState === 'idle' && Math.random() > 0.7 && quietMode.behavior.showAnimations) {
      showInteractionBubble(timeSystem.getGreeting());
    }
  }, [timeSystem.timeOfDay, frogState.currentState, quietMode.behavior.showAnimations, showInteractionBubble, timeSystem]);

  useEffect(() => {
    if (hibernation.status === 'SLEEPING') {
      showInteractionBubble('呼…进入冬眠了');
    } else if (hibernation.status === 'WAKING') {
      showInteractionBubble('慢慢醒过来中…');
    }
  }, [hibernation.status, showInteractionBubble]);

  useEffect(() => {
    if (window.electronAPI?.onMenuAction) {
      window.electronAPI.onMenuAction((action: string) => handleMenuAction(action));
    }
  }, [handleMenuAction]);

  useEffect(() => {
    let cancelled = false;

    const syncWebPrimaryFrog = async () => {
      const frog = await api.getMyFrog(walletAddress);
      if (!frog || cancelled) return;

      setTokenId(frog.tokenId);
      setPetName(prev => {
        try {
          return localStorage.getItem('zfrog_pet_name') || frog.name || prev;
        } catch {
          return frog.name || prev;
        }
      });
    };

    void syncWebPrimaryFrog();

    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      setQuickMenu({ visible: true, x: event.clientX, y: event.clientY });
    };

    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  useEffect(() => {
    setLastInteractTime(Date.now());
  }, [frogState.currentState]);

  useEffect(() => {
    if (loginCheckedRef.current) return;
    loginCheckedRef.current = true;

    const reward = activity.checkDailyLogin();
    if (reward > 0) {
      petStats.addExp(reward);
      showInteractionBubble(`欢迎回来，签到奖励 +${reward} EXP`);
    }
  }, [activity.checkDailyLogin, petStats.addExp, showInteractionBubble]);

  useEffect(() => {
    const streakAchievement = achievements.achievements.find(item => item.id === 'streak_7');
    if (!streakAchievement || streakAchievement.progress === activity.streak || streakAchievement.unlocked) return;
    achievements.updateProgress('streak_7', activity.streak);
  }, [activity.streak, achievements.achievements, achievements.updateProgress]);

  useEffect(() => {
    const friendsAchievement = achievements.achievements.find(item => item.id === 'friends_10');
    if (!friendsAchievement || friendsAchievement.progress === social.friends.length || friendsAchievement.unlocked) return;
    achievements.updateProgress('friends_10', social.friends.length);
  }, [social.friends.length, achievements.achievements, achievements.updateProgress]);

  useEffect(() => {
    const stats = petStats.stats;
    const statValues = [stats.health, stats.hunger, stats.energy, stats.happiness, stats.charm, stats.intelligence];
    const allStatsAchievement = achievements.achievements.find(item => item.id === 'all_stats_max');
    if (statValues.every(value => value >= 100) && allStatsAchievement && !allStatsAchievement.unlocked) {
      achievements.unlockAchievement('all_stats_max');
    }
  }, [petStats.stats, achievements.achievements, achievements.unlockAchievement]);

  useEffect(() => {
    const milestone = longTermGoals.pendingMilestone;
    if (!milestone) {
      handledMilestoneRef.current = null;
      return;
    }

    if (handledMilestoneRef.current === milestone.goalId) return;
    handledMilestoneRef.current = milestone.goalId;

    petStats.addExp(milestone.reward.exp);
    milestone.reward.items.forEach(item => inventory.addItem(item.itemId, item.quantity));
    showInteractionBubble(milestone.message);
    longTermGoals.acknowledgeMilestone(milestone.goalId);
  }, [longTermGoals, inventory, petStats, showInteractionBubble]);

  useEffect(() => {
    if (!travel.currentTravel) {
      travelReadyRef.current = null;
      return;
    }

    if (travel.getProgress() >= 100 && travelReadyRef.current !== travel.currentTravel.id) {
      travelReadyRef.current = travel.currentTravel.id;
      showInteractionBubble(`${travel.currentTravel.name} 的旅行结束了，记得领取收获`);
    }
  }, [travel, showInteractionBubble]);

  useEffect(() => {
    if (!travel.currentTravel && frogState.currentState === 'traveling') {
      frogState.setCurrentState('idle');
    }
  }, [travel.currentTravel, frogState]);

  const handleFrogClick = useCallback((area: string) => {
    if (!quietMode.behavior.allowInteraction) return;
    if (isHibernating) {
      wakeUp();
      return;
    }

    recordInteraction();

    if (pokeCount > 0 && Date.now() - lastInteractTime > 3000) {
      setPokeCount(0);
    }

    switch (area) {
      case 'head':
        performPetInteraction();
        break;
      case 'body':
        setPokeCount(prev => prev + 1);
        frogState.interact('poke');
        handleInteractionSound('poke');
        showInteractionBubble('哎呀！');
        if (pokeCount >= 3) {
          frogState.setAngry();
          showInteractionBubble('哼！');
        }
        break;
      case 'mouth':
        performFeedInteraction();
        break;
      default:
        break;
    }
  }, [
    quietMode.behavior.allowInteraction,
    isHibernating,
    wakeUp,
    recordInteraction,
    pokeCount,
    lastInteractTime,
    performPetInteraction,
    frogState,
    handleInteractionSound,
    showInteractionBubble,
    performFeedInteraction,
  ]);

  const handleDragEnd = useCallback((x: number, y: number) => {
    frogState.setPosition(x, y);
    window.electronAPI?.moveWindow(x, y);
  }, [frogState]);

  const handlePatrolToggle = useCallback(() => {
    if (isPatrolling) {
      frogState.stopPatrol();
      setIsPatrolling(false);
      showInteractionBubble('巡逻结束');
      dailyTasks.completeTask('3');
      achievements.incrementProgress('patrol_5');
    } else {
      frogState.startPatrol();
      setIsPatrolling(true);
      showInteractionBubble('开始巡逻！');
    }
  }, [isPatrolling, frogState, showInteractionBubble, dailyTasks, achievements]);

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
  }, [handlePatrolToggle, frogState, showInteractionBubble, handleMenuAction]);

  const handleQuickMenuSelect = useCallback((action: string) => {
    if (isHibernating) {
      wakeUp();
      showInteractionBubble('它还在睡，先轻轻叫醒它');
      return;
    }

    recordInteraction();

    switch (action) {
      case 'pet':
        performPetInteraction();
        break;
      case 'feed':
        performFeedInteraction();
        break;
      case 'patrol':
        handlePatrolToggle();
        break;
      case 'travel':
        openDialog('travel');
        break;
      case 'sleep':
        frogState.setCurrentState('sleeping');
        showInteractionBubble('晚安～');
        break;
      default:
        break;
    }
  }, [
    isHibernating,
    wakeUp,
    showInteractionBubble,
    recordInteraction,
    performPetInteraction,
    performFeedInteraction,
    handlePatrolToggle,
    openDialog,
    frogState,
  ]);

  const handleTravelStart = useCallback((destinationId: string, duration: number) => {
    const selectedDestination = travel.destinations.find(item => item.id === destinationId);
    if (!selectedDestination) return;

    frogState.setCurrentState('traveling');
    showInteractionBubble(`出发去 ${selectedDestination.name}！`);
    travel.startTravel({ ...selectedDestination, duration });
    dailyTasks.completeTask('4');
  }, [travel, frogState, showInteractionBubble, dailyTasks]);

  const handleTravelComplete = useCallback(() => {
    const result = travel.completeTravel();
    if (!result) return;

    frogState.setCurrentState('happy');
    petStats.addExp(result.exp);
    result.items.forEach(itemId => inventory.addItem(itemId, 1));
    achievements.incrementProgress('travel_3');
    showInteractionBubble(`旅行归来，带回了 ${result.exp} EXP 和新的收获`);
  }, [travel, frogState, petStats, inventory, achievements, showInteractionBubble]);

  const profileData = {
    name: petName,
    ...petStats.stats,
  };

  return (
    <div style={{ width: '100%', height: '100%', background: 'transparent', position: 'relative' }}>
      <WeatherEffect weather={timeSystem.weather} />
      <HibernationStatus state={hibernation} onWake={wakeUp} />
      <StatusBar hunger={petStats.stats.hunger} energy={petStats.stats.energy} happiness={petStats.stats.happiness} />

      <Frog
        state={frogState.currentState}
        mood={frogState.mood}
        stats={petStats.stats}
        onClick={handleFrogClick}
        onDragStart={() => {}}
        onDragEnd={handleDragEnd}
      />

      <InteractionBubble message={bubbleMessage} visible={showBubble} onHide={() => setShowBubble(false)} />

      <QuickMenu
        visible={quickMenu.visible}
        x={quickMenu.x}
        y={quickMenu.y}
        onSelect={handleQuickMenuSelect}
        onClose={() => setQuickMenu(prev => ({ ...prev, visible: false }))}
      />

      <HaloMenu visible={showMenu} onSelect={handleMenuSelect} onClose={() => setShowMenu(false)} />

      <motion.div
        style={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          fontSize: 10,
          opacity: 0.5,
          color: 'white',
          cursor: 'pointer',
          textAlign: 'center',
        }}
        whileHover={{ scale: 1.1 }}
        onClick={() => setShowMenu(prev => !prev)}
      >
        <div>🐸</div>
        <div>{showMenu ? '关闭' : '菜单'}</div>
      </motion.div>

      <motion.div
        style={{ position: 'absolute', bottom: 8, left: 8, fontSize: 9, color: 'rgba(255,255,255,0.5)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        key={frogState.currentState}
      >
        {frogState.currentState === 'idle' && `🐸 Lv.${petStats.stats.level}`}
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

      <TasksDialog
        walletAddress={walletAddress}
        visible={dialogs.tasks}
        onClose={() => closeDialog('tasks')}
        tasks={dailyTasks.tasks}
        totalReward={totalTaskReward}
        longTermGoals={longTermGoals.goals}
        nextTip={longTermGoals.nextTip}
      />
      <FriendsDialog
        walletAddress={walletAddress}
        visible={dialogs.friends}
        onClose={() => closeDialog('friends')}
        friends={social.friends}
      />
      <BadgesDialog
        tokenId={tokenId}
        ownerAddress={walletAddress}
        petName={petName}
        visible={dialogs.badges}
        onClose={() => closeDialog('badges')}
        achievements={achievements.achievements}
      />
      <TravelDialog
        visible={dialogs.travel}
        onClose={() => closeDialog('travel')}
        onTravelStart={handleTravelStart}
        onTravelComplete={handleTravelComplete}
        walletAddress={walletAddress}
        tokenId={tokenId}
        petName={petName}
        travel={travel}
      />
      <SettingsDialog visible={dialogs.settings} onClose={() => closeDialog('settings')} />
      <ChainMonitorPanel
        visible={dialogs.chainMonitor}
        onClose={() => closeDialog('chainMonitor')}
        onSimulate={(event) => chainMonitor.simulateEvent(event as never)}
      />
      <HomeDialog
        visible={dialogs.home}
        onClose={() => closeDialog('home')}
        decorationInventory={decorationInventory}
        decorations={decoration.decorations}
        onPlaceDecoration={handlePlaceDecoration}
        onRemoveDecoration={handleRemoveDecoration}
        longTermGoals={longTermGoals.goals}
      />
      <CollectionDialog
        visible={dialogs.collection}
        onClose={() => closeDialog('collection')}
        entries={collectionBook.collection}
      />
      <BagDialog
        visible={dialogs.bag}
        onClose={() => closeDialog('bag')}
        inventory={inventory}
        onUseItem={handleUseBagItem}
      />
      <ProfileDialog
        visible={dialogs.profile}
        onClose={() => closeDialog('profile')}
        petData={profileData}
        careStreak={longTermGoals.careStreak}
        completedGoalCount={longTermGoals.completedGoalCount}
        collectionSummary={{
          total: collectionBook.collection.length,
          mutationCount: collectionBook.collection.filter(item => item.mutationTraits.length > 0).length,
        }}
        longTermGoals={longTermGoals.goals}
        nextTip={longTermGoals.nextTip}
      />
      <QuietModePanel visible={dialogs.quietMode} onClose={() => closeDialog('quietMode')} />
    </div>
  );
}

export default App;
