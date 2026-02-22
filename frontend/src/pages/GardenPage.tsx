import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMyFrog } from '../hooks/useMyFrog';
import { useFrogData } from '../hooks/useFrogData';
import { GardenScene } from '../components/garden/GardenScene';
import { GardenVisitorList } from '../components/garden/GardenVisitorList';
import { GardenTabs } from '../components/garden/GardenTabs';
import { GardenInteractionPanel } from '../components/garden/GardenInteractionPanel';
import { useGardenWebSocket } from '../hooks/useGardenWebSocket';
import { GardenState, GardenVisit, VisitRequest, GardenFrogState } from '../types/garden';
import { Frog } from '../types';
import { apiService } from '../services/api';
import { MessageBoard } from '../components/garden/MessageBoard';
import { GiftBox } from '../components/garden/GiftBox';
import { PhotoAlbum } from '../components/garden/PhotoAlbum';
import { AchievementWall } from '../components/garden/AchievementWall';
import { CrossChainTransfer } from '../components/crosschain/CrossChainTransfer';
import { GardenDock } from '../components/garden/GardenDock';
import { FrogActionMenu } from '../components/garden/FrogActionMenu';
import { useToast } from '../components/common/ToastProvider';
import { 
  ArrowLeft, 
  Settings, 
  UserPlus, 
  Users, 
  Zap, 
  Rocket, 
  ExternalLink,
  X
} from 'lucide-react';

export const GardenPage: React.FC = () => {
  // 支持两种模式：/garden（我的家园）和 /visit/:address（访问他人）
  const { address: visitAddress } = useParams<{ address: string }>();
  const navigate = useNavigate();
  
  // 获取当前用户的青蛙
  const { frog: myFrog, loading: myFrogLoading, isConnected, hasFrog } = useMyFrog();
  
  // 如果是访问他人家园，获取目标地址的青蛙
  const { frog: visitFrog, loading: visitFrogLoading } = useFrogData(visitAddress || null);
  
  // 确定当前显示的青蛙（自己的或访问的）
  const isVisiting = !!visitAddress;
  const frog = isVisiting ? visitFrog : myFrog;
  const loading = isVisiting ? visitFrogLoading : myFrogLoading;
  
  // 是否是家园主人
  const isOwner = !isVisiting;
  
  // Toast 通知
  const { toast } = useToast();
  
  // 家园状态
  const [gardenState, setGardenState] = useState<GardenState | null>(null);
  const [selectedFrog, setSelectedFrog] = useState<GardenFrogState | null>(null);
  const [activeTab, setActiveTab] = useState<'messages' | 'gifts' | 'photos' | 'achievements' | null>(null);
  const [showVisitorList, setShowVisitorList] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [friendsList, setFriendsList] = useState<Frog[]>([]);
  const [isInviting, setIsInviting] = useState(false);
  const [isStartingGroupTravel, setIsStartingGroupTravel] = useState(false);
  
  // Frog Action Menu State
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [actionMenuPosition, setActionMenuPosition] = useState({ x: 50, y: 50 });
  const [interactingFrog, setInteractingFrog] = useState<GardenFrogState | null>(null);
  
  // TODO: 从 API 获取真实计数
  const unreadMessageCount = 0;
  const unopenedGiftCount = 0;
  
  // WebSocket 连接
  const { isConnected: wsConnected } = useGardenWebSocket(frog?.tokenId || 0, {
    onVisitRequest: (request: VisitRequest) => {
      setGardenState(prev => prev ? {
        ...prev,
        pendingRequests: [...prev.pendingRequests, request]
      } : null);
    },
    onVisitorEntered: (visit: GardenVisit) => {
      setGardenState(prev => prev ? {
        ...prev,
        currentVisitors: [...prev.currentVisitors, visit],
        pendingRequests: prev.pendingRequests.filter(r => r.guestFrogId !== visit.guestFrogId)
      } : null);
    },
    onVisitorLeft: ({ visitId }) => {
      setGardenState(prev => prev ? {
        ...prev,
        currentVisitors: prev.currentVisitors.filter(v => v.id !== visitId)
      } : null);
    }
  });

  // 加载家园数据
  useEffect(() => {
    const loadGardenState = async () => {
      if (!frog) return;
      try {
        const response = await apiService.get(`/garden/${frog.tokenId}`);
        if (response.success && response.data) {
          setGardenState(response.data);
        } else {
          // Fallback to default state if API fails
          setGardenState({
            ownerId: frog.id,
            ownerFrog: frog,
            background: 'pond',
            decorations: [],
            currentVisitors: [],
            pendingRequests: [],
            todayVisitCount: 0,
            totalVisitCount: 0
          });
        }
      } catch (error) {
        console.error('Failed to load garden state:', error);
        // Fallback to default state
        setGardenState({
          ownerId: frog.id,
          ownerFrog: frog,
          background: 'pond',
          decorations: [],
          currentVisitors: [],
          pendingRequests: [],
          todayVisitCount: 0,
          totalVisitCount: 0
        });
      }
    };
    loadGardenState();
  }, [frog]);

  // 处理青蛙点击 - 打开环形菜单
  const handleFrogClick = (frogState: GardenFrogState) => {
    setInteractingFrog(frogState);
    setActionMenuPosition(frogState.position);
    setShowActionMenu(true);
  };
  
  // 菜单动作处理
  const handleMenuAction = (action: string) => {
    setShowActionMenu(false);
    if (!interactingFrog) return;

    switch (action) {
      case 'pet':
        // TODO: 播放抚摸动画
        console.log('Petting frog:', interactingFrog.frog.name);
        break;
      case 'feed':
        // TODO: 打开食物/礼物背包
        setActiveTab('gifts');
        break;
      case 'pack':
         // TODO: 准备旅行
        navigate(`/frog/${frog?.tokenId}`);
        break;
      case 'profile':
        setSelectedFrog(interactingFrog);
        break;
    }
  };

  // 处理接受访问
  const handleAcceptVisit = async (request: VisitRequest) => {
    if (!frog) return;
    try {
      const response = await apiService.post(`/garden/${frog.tokenId}/visit`, {
        guestFrogId: request.guestFrog.tokenId
      });
      if (response.success) {
        // 更新本地状态
        setGardenState(prev => prev ? {
          ...prev,
          currentVisitors: [...prev.currentVisitors, {
            id: response.data?.visitId || Date.now(),
            guestFrogId: request.guestFrog.id,
            guestFrog: request.guestFrog,
            hostFrogId: frog.id,
            status: 'Active' as const,
            startedAt: new Date()
          }],
          pendingRequests: prev.pendingRequests.filter(r => r.id !== request.id)
        } : null);
      }
    } catch (error) {
      console.error('Failed to accept visit:', error);
    }
  };

  // 处理拒绝访问
  const handleRejectVisit = async (request: VisitRequest) => {
    setGardenState(prev => prev ? {
      ...prev,
      pendingRequests: prev.pendingRequests.filter(r => r.id !== request.id)
    } : null);
  };

  // 处理互动完成
  const handleInteractionComplete = async () => {
    setSelectedFrog(null);
    // 刷新家园状态获取最新友好度数据
    if (frog) {
      try {
        const response = await apiService.get(`/garden/${frog.tokenId}`);
        if (response.success && response.data) {
          setGardenState(response.data);
        }
      } catch (error) {
        console.error('Failed to refresh garden state:', error);
      }
    }
  };

  // 加载好友列表
  const loadFriends = async () => {
    if (!frog) return;
    try {
      const response = await apiService.get(`/friends/list/${frog.tokenId}`);
      if (response.success) {
        setFriendsList(response.data);
      }
    } catch (error) {
      console.error('Failed to load friends:', error);
    }
  };

  // 邀请好友来访
  const handleInviteFriend = async (friendFrog: Frog) => {
    if (!frog) return;
    setIsInviting(true);
    try {
      await apiService.post(`/garden/${frog.tokenId}/visit`, {
        guestFrogId: friendFrog.tokenId
      });
      // 刷新访客列表
      setShowInviteModal(false);
    } catch (error) {
      console.error('Failed to invite friend:', error);
    } finally {
      setIsInviting(false);
    }
  };

  // 发起结伴旅行
  const handleStartGroupTravel = async (companionFrog: Frog) => {
    if (!frog) return;
    setIsStartingGroupTravel(true);
    try {
      const response = await apiService.post('/travels/group', {
        leaderId: frog.tokenId,
        companionId: companionFrog.tokenId,
        duration: 3600
      });
      if (response.success) {
        toast.success(`${frog.name} 和 ${companionFrog.name} 一起出发旅行啦！`);
        navigate(`/frog/${frog.tokenId}`);
      }
    } catch (error: any) {
      toast.error(error?.message || '发起结伴旅行失败');
    } finally {
      setIsStartingGroupTravel(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" />
          <p className="text-gray-500">加载家园中...</p>
        </div>
      </div>
    );
  }

  if (!frog) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center">
          <p className="text-2xl mb-4">🐸</p>
          <p className="text-gray-600">找不到这只青蛙</p>
          <button
            onClick={() => navigate('/my-frog')}
            className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            返回我的青蛙
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* 顶部导航 */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 
                      bg-white/10 backdrop-blur-md border-b border-white/20 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-white hover:text-green-200 transition-colors gap-1"
        >
          <ArrowLeft size={20} />
          <span className="font-exo font-medium text-sm">Back</span>
        </button>
        
        <h1 className="text-xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300 drop-shadow-sm">
          {frog.name}'s Garden
        </h1>
        
        <div className="flex gap-2">
          <button 
            onClick={() => { loadFriends(); setShowInviteModal(true); }}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-500/80 hover:bg-green-500 text-white 
                       text-xs rounded-full backdrop-blur-sm transition-all shadow-lg hover:shadow-green-500/30"
          >
            <UserPlus size={14} />
            <span>Invite</span>
          </button>
          <button 
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-all" 
            title="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>
      
      {/* Spacer for flow (since top bar is absolute) */}
      <div className="h-14"></div>

      {/* 主体内容 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 家园场景区域 */}
        <div className="flex-1 relative overflow-hidden">
          {gardenState && (
            <GardenScene
              gardenState={gardenState}
              onFrogClick={handleFrogClick}
              onMailboxClick={() => setActiveTab('messages')}
              onParcelClick={() => setActiveTab('gifts')}
              hasNewMail={unreadMessageCount > 0}
              hasNewGift={unopenedGiftCount > 0}
              currentUserFrogId={myFrog?.id}
            />
          )}
          
          {/* 连接状态指示器 */}
          <div className={`absolute top-4 left-4 flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            wsConnected ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
          }`}>
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
            {wsConnected ? '已连接' : '连接中...'}
          </div>
          
          {/* 移动端切换访客列表按钮 */}
          <button
            onClick={() => setShowVisitorList(!showVisitorList)}
            className="lg:hidden absolute top-4 right-4 p-2 bg-white rounded-full shadow-md"
          >
            👥
          </button>
        </div>

        {/* 访客列表侧边栏 */}
        <AnimatePresence>
          {showVisitorList && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="w-80 bg-white border-l overflow-y-auto"
            >
              {gardenState && (
                <GardenVisitorList
                  visitors={gardenState.currentVisitors}
                  pendingRequests={gardenState.pendingRequests}
                  onAcceptVisit={handleAcceptVisit}
                  onRejectVisit={handleRejectVisit}
                  onVisitorClick={(visit) => {
                    if (visit.guestFrog) {
                      setSelectedFrog({
                        frogId: visit.guestFrogId,
                        frog: visit.guestFrog,
                        position: { x: 50, y: 50 },
                        activity: 'idle',
                        isHost: false,
                        visitStartedAt: visit.startedAt
                      });
                    }
                  }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 底部 Dock 栏 */}
      <GardenDock
        items={[
          { 
            id: 'messages', 
            icon: '📮', 
            label: '留言板', 
            count: unreadMessageCount,
            onClick: () => setActiveTab('messages') 
          },
          { 
            id: 'gifts', 
            icon: '🎒', 
            label: '背包', 
            count: unopenedGiftCount,
            onClick: () => setActiveTab('gifts') 
          },
          { 
            id: 'friends', 
            icon: '👥', 
            label: '好友', 
            onClick: () => setShowVisitorList(true) 
          },
          { 
            id: 'achievements', 
            icon: '🏆', 
            label: '成就', 
            onClick: () => setActiveTab('achievements') 
          },
          {
            id: 'photo',
            icon: '📷',
            label: '相册',
            onClick: () => setActiveTab('photos')
          }
        ]}
      />

      {/* 青蛙环形菜单 */}
      {interactingFrog && (
        <FrogActionMenu
          isOpen={showActionMenu}
          onClose={() => setShowActionMenu(false)}
          position={actionMenuPosition}
          actions={[
            { id: 'pet', icon: '👋', label: '抚摸', color: 'from-pink-400 to-red-400', onClick: () => handleMenuAction('pet') },
            { id: 'feed', icon: '🍱', label: '喂食', color: 'from-orange-400 to-yellow-400', onClick: () => handleMenuAction('feed') },
            { id: 'pack', icon: '🎒', label: '行囊', color: 'from-green-400 to-teal-400', onClick: () => handleMenuAction('pack') },
            { id: 'profile', icon: 'ℹ️', label: '详情', color: 'from-blue-400 to-indigo-400', onClick: () => handleMenuAction('profile') },
          ]}
        />
      )}

      {/* 功能弹窗 */}
      <AnimatePresence>
        {activeTab === 'messages' && (
          <MessageBoard 
            frogId={frog.id} 
            currentFrogId={frog.id} // 当前用户就是青蛙主人
            isOwner={isOwner} 
            onClose={() => setActiveTab(null)} 
          />
        )}
        {activeTab === 'gifts' && (
          <GiftBox 
            frogId={frog.id} 
            isOwner={isOwner} 
            onClose={() => setActiveTab(null)} 
          />
        )}
        {activeTab === 'photos' && (
          <PhotoAlbum 
            frogId={frog.id} 
            isOwner={isOwner} 
            onClose={() => setActiveTab(null)} 
          />
        )}
        {activeTab === 'achievements' && (
          <AchievementWall 
            frogId={frog.id} 
            isOwner={isOwner} 
            onClose={() => setActiveTab(null)} 
          />
        )}
      </AnimatePresence>

      {/* 互动面板 */}
      <AnimatePresence>
        {selectedFrog && (
          <GardenInteractionPanel
            frogState={selectedFrog}
            hostFrogId={frog?.tokenId || 0}
            onClose={() => setSelectedFrog(null)}
            onInteractionComplete={handleInteractionComplete}
          />
        )}
      </AnimatePresence>

      {/* 邀请好友弹窗 */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowInviteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 w-96 max-h-[80vh] overflow-y-auto 
                         text-white shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-orbitron font-bold flex items-center gap-2">
                  <Users className="text-green-400" />
                  Invite Friends
                </h2>
                <button 
                  onClick={() => setShowInviteModal(false)}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              {friendsList.length === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                  <UserPlus size={48} className="mx-auto text-green-400/50 mb-4" />
                  <p className="text-gray-300">No friends yet.</p>
                  <p className="text-xs text-gray-500 mt-2">Go verify cross-chain to find frens!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {friendsList.map((friendFrog: any) => (
                    <div 
                      key={friendFrog.id}
                      className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors"
                    >
                      <div className="flex flex-col">
                        <p className="font-exo font-semibold text-green-300">{friendFrog.name}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          Lv.{friendFrog.level} · 
                          <span className={friendFrog.status === 'Idle' ? 'text-blue-300' : 'text-orange-300'}>
                             {friendFrog.status}
                          </span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {/* 跨链转账按钮 */}
                        <button
                          onClick={() => {
                            setShowInviteModal(false);
                            setShowTransfer(true);
                          }}
                          className="p-2 bg-purple-500/20 text-purple-300 rounded-xl hover:bg-purple-500/40 transition-colors"
                          title="Transfer"
                        >
                          <Zap size={14} />
                        </button>
                        <button
                          onClick={() => handleInviteFriend(friendFrog)}
                          disabled={isInviting}
                          className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-xl 
                                     shadow-lg hover:shadow-green-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Invite
                        </button>
                        {friendFrog.status === 'Idle' && frog?.status === 'Idle' && (
                          <button
                            onClick={() => handleStartGroupTravel(friendFrog)}
                            disabled={isStartingGroupTravel}
                            className="p-2 bg-blue-500/20 text-blue-300 rounded-xl hover:bg-blue-500/40 transition-colors"
                            title="Group Travel"
                          >
                            <Rocket size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <button
                onClick={() => setShowInviteModal(false)}
                className="w-full mt-6 py-3 bg-white/5 border border-white/10 text-gray-300 rounded-2xl 
                           hover:bg-white/10 transition-all font-exo font-medium text-sm"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 跨链转账弹窗 */}
      <CrossChainTransfer 
        frogId={frog.id}
        isOpen={showTransfer}
        onClose={() => setShowTransfer(false)}
      />
    </div>
  );
};
