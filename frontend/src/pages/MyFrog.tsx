import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Loading } from '../components/common/Loading';
import { FeatureGateState } from '../components/common/FeatureGateState';
import { useMyFrog } from '../hooks/useMyFrog';
import { useI18n } from '../i18n';

export function MyFrog() {
  const { tr } = useI18n();
  const { frog, hasFrog, loading, isConnected, address } = useMyFrog();
  const navigate = useNavigate();
  
  // 入口页只做分流：有蛙进详情，无蛙进 Egg Claim
  useEffect(() => {
    if (loading || !isConnected) {
      return;
    }

    if (hasFrog && frog) {
      if (address && frog.ownerAddress.toLowerCase() !== address.toLowerCase()) {
        return;
      }
      navigate(`/frog/${frog.tokenId}`, { replace: true });
      return;
    }

    navigate('/egg-claim', { replace: true });
  }, [loading, isConnected, hasFrog, frog, navigate, address]);

  if (!isConnected) {
    return (
      <FeatureGateState
        emoji="🔗"
        title={tr('请先连接钱包', 'Connect Wallet')}
        description={tr('连接钱包后查看你的青蛙主线入口。', 'Connect wallet to access your frog entry flow.')}
        actionLabel={tr('返回首页', 'Back Home')}
        actionTo="/"
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto text-center py-12">
      <Loading />
      <p className="text-gray-500 mt-4">{tr('正在进入青蛙主线...', 'Entering frog flow...')}</p>
    </div>
  );
}
