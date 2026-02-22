/**
 * 🐸 P5 繁殖系统 - 繁殖面板组件
 * 功能: 条件检查、发起/接受请求、遗传预览
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../../services/api';
import { useMyFrog } from '../../hooks/useMyFrog';

interface BreedPanelProps {
  friendFrogId: number;
  friendName: string;
  intimacy: number;
  onClose: () => void;
}

interface EligibilityResult {
  eligible: boolean;
  errors?: string[];
  frog1?: { id: number; name: string; level: number; personality: string };
  frog2?: { id: number; name: string; level: number; personality: string };
  intimacy: number;
  fee: number;
}

interface BreedRequest {
  id: number;
  status: string;
  requester: { id: number; name: string };
  partner: { id: number; name: string };
  offspringGenes?: any;
  createdAt: string;
}

export const BreedPanel: React.FC<BreedPanelProps> = ({
  friendFrogId,
  friendName,
  intimacy,
  onClose,
}) => {
  const { frog } = useMyFrog();
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [pendingRequests, setPendingRequests] = useState<BreedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (frog?.id) {
      checkEligibility();
      fetchRequests();
    }
  }, [frog?.id, friendFrogId]);

  const checkEligibility = async () => {
    try {
      const response = await apiService.post('/breed/check', {
        frogId1: frog?.id,
        frogId2: friendFrogId,
      });
      if (response.success) {
        setEligibility(response.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const response = await apiService.get(`/breed/requests/${frog?.id}`);
      if (response.success) {
        setPendingRequests(
          response.data.filter(
            (r: BreedRequest) =>
              (r.requester.id === friendFrogId || r.partner.id === friendFrogId) &&
              r.status !== 'Completed' &&
              r.status !== 'Rejected'
          )
        );
      }
    } catch (err) {
      console.error('Error fetching breed requests:', err);
    }
  };

  const sendRequest = async () => {
    setSending(true);
    try {
      const response = await apiService.post('/breed/request', {
        requesterId: frog?.id,
        partnerId: friendFrogId,
      });
      if (response.success) {
        await fetchRequests();
        setError(null);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleAccept = async (requestId: number) => {
    try {
      await apiService.put(`/breed/${requestId}/accept`);
      await fetchRequests();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleReject = async (requestId: number) => {
    try {
      await apiService.put(`/breed/${requestId}/reject`);
      await fetchRequests();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 获取性格预测显示
  const getPersonalityPreview = () => {
    if (!eligibility?.frog1 || !eligibility?.frog2) return null;
    const p1 = eligibility.frog1.personality;
    const p2 = eligibility.frog2.personality;
    return (
      <div className="mt-3 p-3 bg-purple-50 rounded-lg">
        <div className="text-sm font-medium text-purple-800 mb-2">🧬 预计子代特征</div>
        <div className="text-xs text-purple-600 space-y-1">
          <div>• 性格: {p1}(50%) / {p2}(30%) / 随机(20%)</div>
          <div>• 皮肤: 混合变异(30%) / 随机继承(70%)</div>
          <div>• 代数: 第 {Math.max(0, 0) + 1} 代</div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full mx-auto" />
        <div className="mt-3 text-gray-500">检查繁殖条件中...</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-xl p-6 max-w-md mx-auto"
    >
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-pink-600">💕 繁殖配对</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* 双方信息 */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <div className="text-center">
          <div className="text-3xl mb-1">🐸</div>
          <div className="font-medium">{frog?.name}</div>
          <div className="text-xs text-gray-500">Lv.{frog?.level}</div>
        </div>
        <div className="text-2xl text-pink-400">💕</div>
        <div className="text-center">
          <div className="text-3xl mb-1">🐸</div>
          <div className="font-medium">{friendName}</div>
          <div className="text-xs text-gray-500">好友</div>
        </div>
      </div>

      {/* 亲密度进度 */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span>亲密度</span>
          <span className={intimacy >= 100 ? 'text-pink-500 font-bold' : 'text-gray-500'}>
            {intimacy}/100
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${intimacy}%` }}
            className={`h-full ${intimacy >= 100 ? 'bg-pink-500' : 'bg-gray-400'}`}
          />
        </div>
      </div>

      {/* 条件检查结果 */}
      {eligibility && (
        <div className="mb-4">
          {eligibility.eligible ? (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-green-700 font-medium">✅ 满足繁殖条件</div>
              <div className="text-sm text-green-600 mt-1">
                繁殖费用: {eligibility.fee / 2} ZETA (你的份额)
              </div>
            </div>
          ) : (
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="text-red-700 font-medium mb-2">❌ 暂不满足繁殖条件</div>
              <ul className="text-sm text-red-600 list-disc list-inside">
                {eligibility.errors?.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 遗传预览 */}
      {eligibility?.eligible && getPersonalityPreview()}

      {/* 待处理请求 */}
      {pendingRequests.length > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="text-yellow-800 font-medium mb-2">📨 待处理的配对请求</div>
          {pendingRequests.map((req) => (
            <div key={req.id} className="flex items-center justify-between py-2">
              <div className="text-sm">
                {req.requester.id === frog?.id ? (
                  <span>你向 {req.partner.name} 发起的请求</span>
                ) : (
                  <span>{req.requester.name} 向你发起的请求</span>
                )}
                <span className="ml-2 text-xs text-gray-500">({req.status})</span>
              </div>
              {req.requester.id !== frog?.id && req.status === 'Pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(req.id)}
                    className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                  >
                    接受
                  </button>
                  <button
                    onClick={() => handleReject(req.id)}
                    className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                  >
                    拒绝
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 错误提示 */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-2 bg-red-100 text-red-700 rounded text-sm"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 操作按钮 */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
        >
          取消
        </button>
        {eligibility?.eligible && pendingRequests.length === 0 && (
          <button
            onClick={sendRequest}
            disabled={sending}
            className="flex-1 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg 
                       hover:from-pink-600 hover:to-purple-600 disabled:opacity-50"
          >
            {sending ? '发送中...' : '💕 发起配对请求'}
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default BreedPanel;
