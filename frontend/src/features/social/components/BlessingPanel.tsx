import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { socialFeatureApi } from '../api';

interface BlessingPanelProps {
  myFrogId: number;
  myFrogTokenId: number;
  onBlessingCompleted?: () => void;
}

interface FriendWithDormancy {
  id: number;
  tokenId: number;
  name: string;
  level?: number;
  hibernationStatus?: string;
  blessingsReceived?: number;
}

export const BlessingPanel: React.FC<BlessingPanelProps> = ({
  myFrogId,
  myFrogTokenId,
  onBlessingCompleted,
}) => {
  const [friends, setFriends] = useState<FriendWithDormancy[]>([]);
  const [verificationId, setVerificationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sleepingFriends = useMemo(
    () => friends.filter((friend) => friend.hibernationStatus === 'SLEEPING'),
    [friends]
  );

  const loadFriends = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await socialFeatureApi.listFriends(myFrogTokenId);
      setFriends((list as FriendWithDormancy[]) || []);
    } catch (loadError: any) {
      setError(loadError?.message || '加载好友列表失败');
    } finally {
      setLoading(false);
    }
  }, [myFrogTokenId]);

  useEffect(() => {
    void loadFriends();
  }, [loadFriends]);

  const blessFriend = useCallback(
    async (targetFrogId: number) => {
      if (!verificationId.trim()) {
        setError('请先输入 verificationId');
        return;
      }

      setSubmittingId(targetFrogId);
      setError(null);
      setNotice(null);
      try {
        const result = await socialFeatureApi.blessDormant({
          targetFrogId,
          initiatorFrogId: myFrogId,
          verificationId: verificationId.trim(),
        });

        if (!result.success) {
          setError(result.message || '祈福失败');
          return;
        }

        setNotice(result.message || '祈福成功');
        onBlessingCompleted?.();
        await loadFriends();
      } catch (blessError: any) {
        setError(blessError?.message || '祈福失败');
      } finally {
        setSubmittingId(null);
      }
    },
    [verificationId, myFrogId, onBlessingCompleted, loadFriends]
  );

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ border: '1px solid #d1fae5', borderRadius: 12, padding: 12, background: '#ecfeff' }}>
        <div style={{ fontWeight: 700, color: '#115e59', marginBottom: 6 }}>🙏 祈福仪式</div>
        <div style={{ color: '#0f766e', fontSize: 13, marginBottom: 8 }}>
          为沉睡中的好友青蛙祈福，可帮助其降低唤醒成本。
        </div>
        <input
          value={verificationId}
          onChange={(event) => setVerificationId(event.target.value)}
          placeholder="输入 world verify verificationId"
          style={{
            width: '100%',
            border: '1px solid #99f6e4',
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: 13,
          }}
        />
      </div>

      {loading && <div style={{ color: '#475569', fontSize: 13 }}>正在加载可祈福好友...</div>}
      {!loading && sleepingFriends.length === 0 && (
        <div style={{ border: '1px dashed #cbd5e1', borderRadius: 12, padding: 16, color: '#64748b', fontSize: 13 }}>
          当前没有处于冬眠状态的好友。
        </div>
      )}

      {sleepingFriends.map((friend) => (
        <div
          key={friend.id}
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
            <div style={{ fontWeight: 600, color: '#0f172a' }}>🐸 {friend.name}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Token #{friend.tokenId}
              {typeof friend.blessingsReceived === 'number' ? ` · 已获祈福 ${friend.blessingsReceived} 次` : ''}
            </div>
          </div>
          <button
            onClick={() => blessFriend(friend.id)}
            disabled={submittingId === friend.id || !verificationId.trim()}
            style={{
              border: 0,
              borderRadius: 999,
              padding: '7px 12px',
              color: '#042f2e',
              background: 'linear-gradient(135deg, #5eead4 0%, #34d399 100%)',
              fontWeight: 700,
              cursor: submittingId === friend.id ? 'not-allowed' : 'pointer',
              opacity: submittingId === friend.id || !verificationId.trim() ? 0.6 : 1,
            }}
          >
            {submittingId === friend.id ? '祈福中...' : '发起祈福'}
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

export default BlessingPanel;
