import React, { useState, useEffect } from 'react';
import { Frog, FriendInteraction, InteractionType } from '../../types';
import { api } from '../../services/api';

interface FriendInteractionProps {
  friend: Frog;
  friendshipId: number;
  currentFrogId: number;
  onClose: () => void;
  onInteractionComplete?: () => void;
}

const FriendInteractionModal: React.FC<FriendInteractionProps> = ({
  friend,
  friendshipId,
  currentFrogId,
  onClose,
  onInteractionComplete
}) => {
  const [selectedType, setSelectedType] = useState<InteractionType>('Message');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [interactions, setInteractions] = useState<FriendInteraction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const interactionTypes: { type: InteractionType; label: string; icon: string; placeholder: string }[] = [
    { type: 'Message', label: '留言', icon: '💬', placeholder: '想对好友说点什么...' },
    { type: 'Visit', label: '拜访', icon: '🏠', placeholder: '拜访时想说的话...' },
    { type: 'Feed', label: '喂食', icon: '🍃', placeholder: '喂食时的留言...' },
    { type: 'Play', label: '玩耍', icon: '🎮', placeholder: '一起玩耍吧！' },
    { type: 'Gift', label: '送礼', icon: '🎁', placeholder: '礼物附言...' },
    { type: 'Travel', label: '旅行', icon: '✈️', placeholder: '一起去旅行吧！' }
  ];

  useEffect(() => {
    fetchInteractionHistory();
  }, [friendshipId]);

  const fetchInteractionHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await api.get(`/api/friends/${friendshipId}/interactions?limit=10`);
      setInteractions(response.data);
    } catch (err) {
      console.error('Error fetching interaction history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleInteraction = async () => {
    if (!message.trim() && selectedType === 'Message') {
      alert('请输入留言内容');
      return;
    }

    setLoading(true);
    try {
      const metadata = {};
      
      await api.post(`/api/friends/${friendshipId}/interact`, {
        actorId: currentFrogId,
        type: selectedType,
        message: message.trim() || undefined,
        metadata
      });

      setMessage('');
      await fetchInteractionHistory();
      onInteractionComplete?.();
    } catch (err) {
      console.error('Error creating interaction:', err);
      alert('互动失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const getInteractionTypeText = (type: InteractionType) => {
    const typeInfo = interactionTypes.find(t => t.type === type);
    return typeInfo ? typeInfo.label : type;
  };

  const getInteractionIcon = (type: InteractionType) => {
    const typeInfo = interactionTypes.find(t => t.type === type);
    return typeInfo ? typeInfo.icon : '💭';
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes}分钟前`;
    } else if (hours < 24) {
      return `${hours}小时前`;
    } else {
      const days = Math.floor(hours / 24);
      return `${days}天前`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg sm:text-xl font-semibold">
            与 {friend.name} 互动
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        {/* 互动类型选择 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择互动类型
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {interactionTypes.map((type) => (
              <button
                key={type.type}
                onClick={() => setSelectedType(type.type)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  selectedType === type.type
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-1">{type.icon}</div>
                <div className="text-sm font-medium">{type.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 消息输入 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            留言 (可选)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={interactionTypes.find(t => t.type === selectedType)?.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row gap-2 mb-6">
          <button
            onClick={handleInteraction}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm sm:text-base"
          >
            {loading ? '发送中...' : `发送${getInteractionTypeText(selectedType)}`}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm sm:text-base"
          >
            取消
          </button>
        </div>

        {/* 互动历史 */}
        <div>
          <h4 className="font-semibold mb-3">互动历史</h4>
          {loadingHistory ? (
            <div className="text-center py-4 text-gray-500">加载中...</div>
          ) : interactions.length === 0 ? (
            <div className="text-center py-4 text-gray-500">暂无互动记录</div>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {interactions.map((interaction) => (
                <div
                  key={interaction.id}
                  className={`p-3 rounded-lg ${
                    interaction.actorId === currentFrogId
                      ? 'bg-blue-50 ml-8'
                      : 'bg-gray-50 mr-8'
                  }`}
                >
                  <div className="flex items-center mb-1">
                    <span className="text-lg mr-2">
                      {getInteractionIcon(interaction.type)}
                    </span>
                    <span className="font-medium text-sm">
                      {interaction.actor?.name}
                    </span>
                    <span className="text-xs text-gray-500 ml-auto">
                      {formatTime(interaction.createdAt)}
                    </span>
                  </div>
                  {interaction.message && (
                    <div className="text-sm text-gray-700">
                      {interaction.message}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    {getInteractionTypeText(interaction.type)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendInteractionModal;