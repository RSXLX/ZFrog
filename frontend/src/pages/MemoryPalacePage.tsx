import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { Rocket, UserPlus, Users, X, Zap } from 'lucide-react';
import { Button } from '../components/common/Button';
import { CrossChainTransfer } from '../components/crosschain/CrossChainTransfer';
import { AchievementWall } from '../components/garden/AchievementWall';
import { GardenInteractionPanel } from '../components/garden/GardenInteractionPanel';
import { GardenScene } from '../components/garden/GardenScene';
import { GardenVisitorList } from '../components/garden/GardenVisitorList';
import { GiftBox } from '../components/garden/GiftBox';
import { MessageBoard } from '../components/garden/MessageBoard';
import { PhotoAlbum } from '../components/garden/PhotoAlbum';
import { FrogActionMenu } from '../components/garden/FrogActionMenu';
import { useToast } from '../components/common/ToastProvider';
import { gardenFeatureApi } from '../features/garden/api';
import { memoryPalaceApi, type MemoryPalaceLite } from '../features/memory-palace/api';
import { MemoryPalaceView } from '../features/memory-palace/components/MemoryPalaceView';
import { frogFeatureApi } from '../features/frog/api';
import { socialFeatureApi } from '../features/social/api';
import { travelFeatureApi } from '../features/travel/api';
import { useGardenWebSocket } from '../hooks/useGardenWebSocket';
import { useMyFrog } from '../hooks/useMyFrog';
import { useI18n } from '../i18n';
import type { Frog } from '../types';
import type { GardenFrogState, GardenState, GardenVisit, VisitRequest } from '../types/garden';

type ActiveSpacePanel = 'messages' | 'gifts' | 'photos' | 'achievements' | null;

const toRenderableFrog = (frog: MemoryPalaceLite['frog']): Frog => ({
  id: frog.id,
  tokenId: frog.tokenId,
  name: frog.name,
  ownerAddress: frog.ownerAddress,
  birthday: new Date(frog.birthday),
  totalTravels: frog.totalTravels,
  status: frog.status,
  xp: frog.xp,
  level: frog.level,
});

export function MemoryPalacePage() {
  const { tr } = useI18n();
  const navigate = useNavigate();
  const { frogId } = useParams<{ frogId: string }>();
  const { toast } = useToast();
  const { frog: myFrog, isConnected } = useMyFrog();
  const [memory, setMemory] = useState<MemoryPalaceLite | null>(null);
  const [loading, setLoading] = useState(true);
  const [gardenLoading, setGardenLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gardenState, setGardenState] = useState<GardenState | null>(null);
  const [activePanel, setActivePanel] = useState<ActiveSpacePanel>(null);
  const [selectedFrog, setSelectedFrog] = useState<GardenFrogState | null>(null);
  const [interactingFrog, setInteractingFrog] = useState<GardenFrogState | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [actionMenuPosition, setActionMenuPosition] = useState({ x: 50, y: 50 });
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [friendsList, setFriendsList] = useState<Frog[]>([]);
  const [isInviting, setIsInviting] = useState(false);
  const [isStartingGroupTravel, setIsStartingGroupTravel] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [unopenedGiftCount, setUnopenedGiftCount] = useState(0);
  const parsedFrogId = Number(frogId);
  const targetFrogId = Number.isInteger(parsedFrogId) && parsedFrogId > 0 ? parsedFrogId : null;
  const isOwner = Boolean(myFrog?.id && targetFrogId && myFrog.id === targetFrogId);
  const memoryFrog = memory?.frog ? toRenderableFrog(memory.frog) : null;
  const displayFrog = isOwner ? myFrog ?? memoryFrog : memoryFrog;
  const currentFrogId = myFrog?.id ?? targetFrogId ?? 0;
  const gardenTokenId = displayFrog?.tokenId ?? 0;

  const refreshSpaceCounts = async () => {
    if (!targetFrogId || !isOwner) {
      setUnreadMessageCount(0);
      setUnopenedGiftCount(0);
      return;
    }

    try {
      const [messages, gifts] = await Promise.all([
        gardenFeatureApi.getMessages(targetFrogId),
        gardenFeatureApi.getGifts(targetFrogId, {
          unopenedOnly: 'true',
          page: 1,
          pageSize: 1,
        }),
      ]);

      setUnreadMessageCount(messages.filter((message: any) => !message.isRead).length);
      setUnopenedGiftCount(Number(gifts?.total || 0));
    } catch (countError) {
      console.error('Failed to refresh memory space counts:', countError);
      setUnreadMessageCount(0);
      setUnopenedGiftCount(0);
    }
  };

  const refreshGardenState = async () => {
    if (!displayFrog || !gardenTokenId) {
      setGardenState(null);
      return;
    }

    try {
      setGardenLoading(true);
      const state = await gardenFeatureApi.getGarden(gardenTokenId);
      if (state) {
        setGardenState(state);
        return;
      }
    } catch (gardenError) {
      console.error('Failed to load memory space scene:', gardenError);
    } finally {
      setGardenLoading(false);
    }

    setGardenState({
      ownerId: displayFrog.id,
      ownerFrog: displayFrog,
      background: 'pond',
      decorations: [],
      currentVisitors: [],
      pendingRequests: [],
      todayVisitCount: 0,
      totalVisitCount: 0,
    });
  };

  const closeActivePanel = () => {
    setActivePanel(null);
    void refreshSpaceCounts();
  };

  const loadFriends = async () => {
    if (!myFrog?.tokenId) {
      return;
    }

    try {
      const friends = await socialFeatureApi.listFriends(myFrog.tokenId);
      setFriendsList(friends as Frog[]);
    } catch (friendsError) {
      console.error('Failed to load friends:', friendsError);
      toast.error(tr('加载好友失败', 'Failed to load friends'));
    }
  };

  const handleFrogClick = (frogState: GardenFrogState) => {
    setInteractingFrog(frogState);
    setActionMenuPosition(frogState.position);
    setShowActionMenu(true);
  };

  const handleStartGroupTravel = async (companionFrog: Frog) => {
    if (!myFrog?.tokenId) {
      return;
    }

    setIsStartingGroupTravel(true);
    try {
      const response = await travelFeatureApi.startGroupTravel({
        leaderId: myFrog.tokenId,
        companionId: companionFrog.tokenId,
        duration: 3600,
      });

      if (response.success) {
        toast.success(`${myFrog.name} ${tr('和', 'and')} ${companionFrog.name} ${tr('一起出发旅行啦！', 'started a trip together!')}`);
        navigate(`/frog/${myFrog.tokenId}`);
      }
    } catch (groupTravelError: any) {
      toast.error(groupTravelError?.message || tr('发起结伴旅行失败', 'Failed to start group travel'));
    } finally {
      setIsStartingGroupTravel(false);
    }
  };

  const handleMenuAction = async (action: string) => {
    setShowActionMenu(false);
    if (!interactingFrog || !displayFrog) {
      return;
    }

    switch (action) {
      case 'pet': {
        try {
          if (interactingFrog.isHost && interactingFrog.frog.ownerAddress) {
            await frogFeatureApi.interact(interactingFrog.frog.tokenId, {
              interactionType: 'pet',
              ownerAddress: interactingFrog.frog.ownerAddress,
            });
          } else if (gardenTokenId) {
            await gardenFeatureApi.interact(gardenTokenId, {
              targetFrogId: interactingFrog.frog.tokenId,
              type: 'like',
            });
          }
          toast.success(tr('互动已发送', 'Interaction sent'));
        } catch (interactionError: any) {
          toast.error(interactionError?.message || tr('互动失败，请稍后重试', 'Interaction failed, please try again later'));
        }
        break;
      }
      case 'feed': {
        try {
          if (interactingFrog.isHost) {
            setActivePanel('gifts');
            toast.info(tr('打开礼物盒，继续完成这次互动', 'Open the gift box to continue this interaction'));
          } else if (gardenTokenId) {
            await gardenFeatureApi.interact(gardenTokenId, {
              targetFrogId: interactingFrog.frog.tokenId,
              type: 'feed',
              data: { foodType: 'apple' },
            });
            toast.success(tr('喂食成功', 'Feeding sent'));
          }
        } catch (feedError: any) {
          toast.error(feedError?.message || tr('喂食失败，请稍后重试', 'Feeding failed, please try again later'));
        }
        break;
      }
      case 'pack': {
        if (interactingFrog.isHost) {
          navigate(`/frog/${interactingFrog.frog.tokenId}`);
        } else {
          await handleStartGroupTravel(interactingFrog.frog);
        }
        break;
      }
      case 'profile':
        setSelectedFrog(interactingFrog);
        break;
    }
  };

  const handleAcceptVisit = async (request: VisitRequest) => {
    if (!gardenTokenId || !displayFrog) {
      return;
    }

    try {
      const response = await gardenFeatureApi.visit(gardenTokenId, request.guestFrog.tokenId);
      if (response.success) {
        setGardenState((prev) =>
          prev
            ? {
                ...prev,
                currentVisitors: [
                  ...prev.currentVisitors,
                  {
                    id: response.data?.visitId || Date.now(),
                    guestFrogId: request.guestFrog.id,
                    guestFrog: request.guestFrog,
                    hostFrogId: displayFrog.id,
                    status: 'Active',
                    startedAt: new Date(),
                  },
                ],
                pendingRequests: prev.pendingRequests.filter((item) => item.id !== request.id),
              }
            : prev
        );
      }
    } catch (acceptError) {
      console.error('Failed to accept visit:', acceptError);
    }
  };

  const handleRejectVisit = (request: VisitRequest) => {
    setGardenState((prev) =>
      prev
        ? {
            ...prev,
            pendingRequests: prev.pendingRequests.filter((item) => item.id !== request.id),
          }
        : prev
    );
  };

  const handleInteractionComplete = async () => {
    setSelectedFrog(null);
    await refreshGardenState();
  };

  const handleInviteFriend = async (friendFrog: Frog) => {
    if (!myFrog?.tokenId) {
      return;
    }

    setIsInviting(true);
    try {
      await gardenFeatureApi.visit(myFrog.tokenId, friendFrog.tokenId);
      toast.success(tr('邀请已发送', 'Invitation sent'));
      setShowInviteModal(false);
      await refreshGardenState();
    } catch (inviteError: any) {
      toast.error(inviteError?.message || tr('邀请失败，请稍后重试', 'Invitation failed, please try again later'));
    } finally {
      setIsInviting(false);
    }
  };

  const { isConnected: wsConnected } = useGardenWebSocket(
    gardenTokenId,
    {
      onVisitRequest: (request: VisitRequest) => {
        setGardenState((prev) =>
          prev
            ? {
                ...prev,
                pendingRequests: [...prev.pendingRequests, request],
              }
            : prev
        );
      },
      onVisitorEntered: (visit: GardenVisit) => {
        setGardenState((prev) =>
          prev
            ? {
                ...prev,
                currentVisitors: [...prev.currentVisitors, visit],
                pendingRequests: prev.pendingRequests.filter((item) => item.guestFrogId !== visit.guestFrogId),
              }
            : prev
        );
      },
      onVisitorLeft: ({ visitId }) => {
        setGardenState((prev) =>
          prev
            ? {
                ...prev,
                currentVisitors: prev.currentVisitors.filter((visit) => visit.id !== visitId),
              }
            : prev
        );
      },
      onMessage: () => {
        void refreshSpaceCounts();
      },
      onGift: () => {
        void refreshSpaceCounts();
      },
    },
    {
      enabled: Boolean(gardenTokenId) && (isOwner ? isConnected : true),
    }
  );

  useEffect(() => {
    if (!frogId) {
      navigate('/my-frog', { replace: true });
      return;
    }

    const id = Number(frogId);
    if (!Number.isInteger(id) || id <= 0) {
      setLoading(false);
      setError('Invalid frog ID');
      return;
    }

    let cancelled = false;
    const loadMemory = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await memoryPalaceApi.getByFrogId(id);
        if (!cancelled) {
          setMemory(response);
        }
      } catch (memoryError: any) {
        if (!cancelled) {
          setError(memoryError?.message || 'Failed to load memory palace');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadMemory();
    return () => {
      cancelled = true;
    };
  }, [frogId, navigate]);

  useEffect(() => {
    void refreshSpaceCounts();
  }, [targetFrogId, isOwner]);

  useEffect(() => {
    void refreshGardenState();
  }, [displayFrog?.id, gardenTokenId]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-emerald-100 p-4">
      <div className="mx-auto max-w-6xl space-y-4 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {tr('记忆空间', 'Memory Palace')}
            </h1>
            {displayFrog ? (
              <p className="mt-1 text-sm text-slate-500">
                {tr(`${displayFrog.name} 的空间与见证都收敛在这里。`, `${displayFrog.name}'s space, memories, and witness traces all live here.`)}
              </p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/travel-history')}>
              {tr('旅行历史', 'Travel History')}
            </Button>
            <Button variant="outline" onClick={() => navigate('/my-frog')}>
              {tr('我的青蛙', 'My Frog')}
            </Button>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <MemoryPalaceView memoryPalace={memory} loading={loading} onOpenFull={undefined} />

        {displayFrog && gardenState ? (
          <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {tr('空间场景', 'Space Scene')}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {isOwner
                    ? tr('装修、访客和实时互动都已经回收到记忆空间主视图。', 'Layout editing, visitors, and real-time interactions now live in the main memory space.')
                    : tr('这是对方当前可被访问的空间场景与来访状态。', 'This is the live scene and visitor state of the space you are viewing.')}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    wsConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {wsConnected ? tr('实时连接中', 'Live Connected') : tr('实时连接中断', 'Live Sync Offline')}
                </span>
                {isOwner ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      void loadFriends();
                      setShowInviteModal(true);
                    }}
                  >
                    {tr('邀请好友', 'Invite Friends')}
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50/60">
              <div className="h-[420px] md:h-[520px]">
                {gardenLoading ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    {tr('正在加载空间场景...', 'Loading space scene...')}
                  </div>
                ) : (
                  <GardenScene
                    gardenState={gardenState}
                    onFrogClick={handleFrogClick}
                    onMailboxClick={() => setActivePanel('messages')}
                    onParcelClick={() => setActivePanel('gifts')}
                    hasNewMail={unreadMessageCount > 0}
                    hasNewGift={unopenedGiftCount > 0}
                    currentUserFrogId={myFrog?.id}
                  />
                )}
              </div>
            </div>
          </section>
        ) : null}

        {gardenState ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {tr('访客与见证', 'Visitors & Witness')}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {isOwner
                    ? tr('访客列表、访问请求和邀请入口都已经并到记忆空间。', 'Visitor lists, visit requests, and invitations have been merged into the memory space.')
                    : tr('你可以在这里查看这只青蛙最近的来访痕迹和空间活跃度。', 'You can see recent visitor traces and live activity for this frog here.')}
                </p>
              </div>
              {isOwner ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    void loadFriends();
                    setShowInviteModal(true);
                  }}
                >
                  {tr('再次邀请', 'Invite Again')}
                </Button>
              ) : null}
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-100">
              <div className="h-[360px] overflow-y-auto">
                <GardenVisitorList
                  visitors={gardenState.currentVisitors}
                  pendingRequests={gardenState.pendingRequests}
                  onAcceptVisit={handleAcceptVisit}
                  onRejectVisit={handleRejectVisit}
                  onVisitorClick={(visit) => {
                    if (!visit.guestFrog) {
                      return;
                    }
                    setSelectedFrog({
                      frogId: visit.guestFrogId,
                      frog: visit.guestFrog,
                      position: { x: 50, y: 50 },
                      activity: 'idle',
                      isHost: false,
                      visitStartedAt: visit.startedAt,
                    });
                  }}
                />
              </div>
            </div>
          </section>
        ) : null}

        {targetFrogId ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {tr('空间互动', 'Space Actions')}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {isOwner
                    ? tr('留言、礼物、照片、成就和布置都已经并入记忆空间。', 'Messages, gifts, photos, achievements, and layout editing have all been merged into the memory space.')
                    : tr('你可以直接在记忆空间里浏览互动记录，并继续留下见证。', 'You can browse interaction history directly in the memory space and continue leaving witness traces.')}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <button
                type="button"
                onClick={() => setActivePanel('messages')}
                className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left transition-colors hover:bg-amber-100"
              >
                <div className="text-2xl">📝</div>
                <div className="mt-3 font-semibold text-amber-900">{tr('留言板', 'Messages')}</div>
                <div className="mt-1 text-sm text-amber-800">
                  {tr('查看见证与留言，继续保持空间互动。', 'Read and leave witness messages directly from the space.')}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActivePanel('photos')}
                className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-left transition-colors hover:bg-blue-100"
              >
                <div className="text-2xl">📷</div>
                <div className="mt-3 font-semibold text-blue-900">{tr('相册', 'Photos')}</div>
                <div className="mt-1 text-sm text-blue-800">
                  {tr('浏览旅行照片和可铸造成 NFT 的记忆片段。', 'Browse travel photos and the memory moments that can be minted as NFTs.')}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActivePanel('achievements')}
                className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-left transition-colors hover:bg-violet-100"
              >
                <div className="text-2xl">🏆</div>
                <div className="mt-3 font-semibold text-violet-900">{tr('成就', 'Achievements')}</div>
                <div className="mt-1 text-sm text-violet-800">
                  {tr('查看旅途、社交与陈列积累下来的空间荣誉。', 'See the travel, social, and curation milestones collected in this space.')}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActivePanel('gifts')}
                className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-left transition-colors hover:bg-rose-100"
              >
                <div className="text-2xl">🎁</div>
                <div className="mt-3 font-semibold text-rose-900">
                  {isOwner ? tr('礼物盒', 'Gift Box') : tr('礼物记录', 'Gift History')}
                </div>
                <div className="mt-1 text-sm text-rose-800">
                  {isOwner
                    ? tr('继续在空间里查看和拆开收到的礼物。', 'Keep opening and reviewing gifts directly from the space.')
                    : tr('查看这只青蛙在空间里收到的礼物记录。', 'Review the gifts this frog has received in the space.')}
                </div>
              </button>
            </div>
          </section>
        ) : null}
      </div>

      {targetFrogId && activePanel === 'messages' ? (
        <MessageBoard
          frogId={targetFrogId}
          currentFrogId={currentFrogId}
          isOwner={isOwner}
          onClose={closeActivePanel}
        />
      ) : null}

      {targetFrogId && activePanel === 'gifts' ? (
        <GiftBox frogId={targetFrogId} isOwner={isOwner} onClose={closeActivePanel} />
      ) : null}

      {targetFrogId && activePanel === 'photos' ? (
        <PhotoAlbum frogId={targetFrogId} isOwner={isOwner} onClose={closeActivePanel} />
      ) : null}

      {targetFrogId && activePanel === 'achievements' ? (
        <AchievementWall frogId={targetFrogId} isOwner={isOwner} onClose={closeActivePanel} />
      ) : null}

      <AnimatePresence>
        {selectedFrog && (
          <GardenInteractionPanel
            frogState={selectedFrog}
            hostFrogId={gardenTokenId}
            onClose={() => setSelectedFrog(null)}
            onInteractionComplete={handleInteractionComplete}
          />
        )}
      </AnimatePresence>

      {interactingFrog ? (
        <FrogActionMenu
          isOpen={showActionMenu}
          onClose={() => setShowActionMenu(false)}
          position={actionMenuPosition}
          actions={[
            { id: 'pet', icon: '👋', label: tr('抚摸', 'Pet'), color: 'from-pink-400 to-red-400', onClick: () => void handleMenuAction('pet') },
            { id: 'feed', icon: '🍱', label: tr('喂食', 'Feed'), color: 'from-orange-400 to-yellow-400', onClick: () => void handleMenuAction('feed') },
            { id: 'pack', icon: '🎒', label: tr('行囊', 'Pack'), color: 'from-green-400 to-teal-400', onClick: () => void handleMenuAction('pack') },
            { id: 'profile', icon: 'ℹ️', label: tr('详情', 'Details'), color: 'from-blue-400 to-indigo-400', onClick: () => void handleMenuAction('profile') },
          ]}
        />
      ) : null}

      <AnimatePresence>
        {showInviteModal ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setShowInviteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-h-[80vh] w-96 overflow-y-auto rounded-3xl border border-white/20 bg-white/10 p-6 text-white shadow-2xl backdrop-blur-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xl font-bold">
                  <Users className="text-green-400" />
                  {tr('邀请好友', 'Invite Friends')}
                </h2>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="rounded-full p-1 transition-colors hover:bg-white/10"
                >
                  <X size={20} />
                </button>
              </div>

              {friendsList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 py-12 text-center">
                  <UserPlus size={48} className="mx-auto mb-4 text-green-400/50" />
                  <p className="text-gray-300">{tr('还没有好友', 'No friends yet.')}</p>
                  <p className="mt-2 text-xs text-gray-500">
                    {tr('先完成跨链验证或社交连接，再把他们邀请进来。', 'Verify cross-chain or connect socially first, then invite them in.')}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {friendsList.map((friendFrog) => (
                    <div
                      key={friendFrog.id}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3 transition-colors hover:bg-white/10"
                    >
                      <div className="flex flex-col">
                        <p className="font-semibold text-green-300">{friendFrog.name}</p>
                        <p className="flex items-center gap-1 text-xs text-gray-400">
                          Lv.{friendFrog.level || 1}
                          <span>·</span>
                          <span className={friendFrog.status === 'Idle' ? 'text-blue-300' : 'text-orange-300'}>
                            {friendFrog.status || 'Idle'}
                          </span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setShowInviteModal(false);
                            setShowTransfer(true);
                          }}
                          className="rounded-xl bg-purple-500/20 p-2 text-purple-300 transition-colors hover:bg-purple-500/40"
                          title={tr('转账', 'Transfer')}
                        >
                          <Zap size={14} />
                        </button>
                        <button
                          onClick={() => void handleInviteFriend(friendFrog)}
                          disabled={isInviting}
                          className="rounded-xl bg-green-500 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {tr('邀请', 'Invite')}
                        </button>
                        {friendFrog.status === 'Idle' && myFrog?.status === 'Idle' ? (
                          <button
                            onClick={() => void handleStartGroupTravel(friendFrog)}
                            disabled={isStartingGroupTravel}
                            className="rounded-xl bg-blue-500/20 p-2 text-blue-300 transition-colors hover:bg-blue-500/40"
                            title={tr('结伴旅行', 'Group Travel')}
                          >
                            <Rocket size={14} />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowInviteModal(false)}
                className="mt-6 w-full rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-gray-300 transition-all hover:bg-white/10"
              >
                {tr('关闭', 'Close')}
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {myFrog ? (
        <CrossChainTransfer frogId={myFrog.id} isOpen={showTransfer} onClose={() => setShowTransfer(false)} />
      ) : null}
    </div>
  );
}

export default MemoryPalacePage;
