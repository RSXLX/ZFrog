import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { socialFeatureApi } from '../api';
import {
  travelFeatureApi,
  type TravelRescueRequestReadModel,
  type TravelRescueResult,
} from '../../travel/api';

interface RescuePanelProps {
  myFrogId: number;
  onRescueCompleted?: (result: TravelRescueResult) => void;
}

type RescueTab = 'friends' | 'public';

const getChainName = (chainId: number): string => {
  const chains: Record<number, string> = {
    1: 'Ethereum',
    56: 'BNB Chain',
    137: 'Polygon',
    7001: 'ZetaChain',
  };

  return chains[chainId] || `Chain ${chainId}`;
};

export const RescuePanel: React.FC<RescuePanelProps> = ({ myFrogId, onRescueCompleted }) => {
  const [tab, setTab] = useState<RescueTab>('friends');
  const [verificationId, setVerificationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittingTravelId, setSubmittingTravelId] = useState<number | null>(null);
  const [friendRequests, setFriendRequests] = useState<TravelRescueRequestReadModel[]>([]);
  const [publicRequests, setPublicRequests] = useState<TravelRescueRequestReadModel[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requests = useMemo(
    () => (tab === 'friends' ? friendRequests : publicRequests),
    [tab, friendRequests, publicRequests]
  );

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'friends') {
        const friendData = await travelFeatureApi.getFriendRescueRequests(myFrogId);
        setFriendRequests(friendData);
        return;
      }

      const publicData = await travelFeatureApi.getPublicRescueRequests(20);
      setPublicRequests(publicData);
    } catch (loadError: any) {
      setError(loadError?.message || '加载救援请求失败');
    } finally {
      setLoading(false);
    }
  }, [myFrogId, tab]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const rescue = useCallback(
    async (requestItem: TravelRescueRequestReadModel) => {
      if (!verificationId.trim()) {
        setError('请先输入 verificationId');
        return;
      }

      setSubmittingTravelId(requestItem.travel.id);
      setError(null);
      setNotice(null);

      try {
        const result = await socialFeatureApi.rescueTravel({
          travelId: requestItem.travel.id,
          initiatorFrogId: myFrogId,
          verificationId: verificationId.trim(),
        });

        if (!result.success) {
          setError(result.message || '救援失败');
          return;
        }

        const nextResult: TravelRescueResult = {
          success: true,
          message: result.message,
          xpEarned: result.xpEarned,
          reputationEarned: result.reputationEarned,
        };

        setNotice(
          result.message ||
            `救援成功，获得 ${result.xpEarned || 0} XP / ${result.reputationEarned || 0} 信誉分`
        );
        onRescueCompleted?.(nextResult);
        await loadRequests();
      } catch (rescueError: any) {
        setError(rescueError?.message || '救援失败');
      } finally {
        setSubmittingTravelId(null);
      }
    },
    [verificationId, myFrogId, onRescueCompleted, loadRequests]
  );

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ border: '1px solid #fecaca', borderRadius: 12, padding: 12, background: '#fff7ed' }}>
        <div style={{ fontWeight: 700, color: '#9a3412', marginBottom: 6 }}>🆘 跨链救援</div>
        <div style={{ color: '#9a3412', fontSize: 13, marginBottom: 8 }}>
          好友跨链旅行迷路时，可发起救援并沉淀关系里程碑。
        </div>
        <input
          value={verificationId}
          onChange={(event) => setVerificationId(event.target.value)}
          placeholder="输入 world verify verificationId"
          style={{
            width: '100%',
            border: '1px solid #fdba74',
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: 13,
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => setTab('friends')}
          style={{
            border: 0,
            borderRadius: 999,
            padding: '6px 12px',
            background: tab === 'friends' ? 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)' : '#e2e8f0',
            color: tab === 'friends' ? '#fff' : '#334155',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          好友求救 ({friendRequests.length})
        </button>
        <button
          onClick={() => setTab('public')}
          style={{
            border: 0,
            borderRadius: 999,
            padding: '6px 12px',
            background: tab === 'public' ? 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)' : '#e2e8f0',
            color: tab === 'public' ? '#fff' : '#334155',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          公共救援 ({publicRequests.length})
        </button>
      </div>

      {loading && <div style={{ color: '#475569', fontSize: 13 }}>正在同步救援列表...</div>}
      {!loading && requests.length === 0 && (
        <div style={{ border: '1px dashed #cbd5e1', borderRadius: 12, padding: 16, color: '#64748b', fontSize: 13 }}>
          当前没有待处理的救援请求。
        </div>
      )}

      {requests.map((requestItem) => (
        <div
          key={requestItem.id}
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div>
            <div style={{ fontWeight: 600, color: '#0f172a' }}>
              🐸 {requestItem.strandedFrog.name}
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              {getChainName(requestItem.travel.chainId)} · {new Date(requestItem.requestedAt).toLocaleString()}
            </div>
          </div>
          <button
            onClick={() => rescue(requestItem)}
            disabled={submittingTravelId === requestItem.travel.id || !verificationId.trim()}
            style={{
              border: 0,
              borderRadius: 999,
              padding: '7px 12px',
              color: '#431407',
              background: 'linear-gradient(135deg, #fdba74 0%, #fb923c 100%)',
              fontWeight: 700,
              cursor: submittingTravelId === requestItem.travel.id ? 'not-allowed' : 'pointer',
              opacity: submittingTravelId === requestItem.travel.id || !verificationId.trim() ? 0.6 : 1,
            }}
          >
            {submittingTravelId === requestItem.travel.id ? '救援中...' : '执行救援'}
          </button>
        </div>
      ))}

      {notice && (
        <div style={{ borderRadius: 8, background: '#dcfce7', color: '#166534', padding: '8px 10px', fontSize: 13 }}>
          {notice}
        </div>
      )}
      {error && (
        <div style={{ borderRadius: 8, background: '#fee2e2', color: '#991b1b', padding: '8px 10px', fontSize: 13 }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default RescuePanel;
