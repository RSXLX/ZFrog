import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FeatureGateState } from '../components/common/FeatureGateState';
import { Loading } from '../components/common/Loading';
import { useMyFrog } from '../hooks/useMyFrog';
import { useI18n } from '../i18n';
import { EggIntroFlow } from '../features/egg/components/EggIntroFlow';

export function EggClaimPage() {
  const { tr } = useI18n();
  const navigate = useNavigate();
  const { frog, hasFrog, loading, isConnected } = useMyFrog();

  useEffect(() => {
    if (!loading && hasFrog && frog) {
      navigate(`/frog/${frog.tokenId}`, { replace: true });
    }
  }, [loading, hasFrog, frog, navigate]);

  if (!isConnected) {
    return (
      <FeatureGateState
        emoji="🔗"
        title={tr('请先连接钱包', 'Connect Wallet')}
        description={tr(
          '连接钱包后即可认领青蛙蛋并开始你的主线旅程。',
          'Connect your wallet to claim an egg and start your main journey.'
        )}
        actionLabel={tr('返回首页', 'Back Home')}
        actionTo="/"
      />
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <Loading />
        <p className="text-gray-500 mt-4">{tr('正在检查青蛙状态...', 'Checking frog status...')}</p>
      </div>
    );
  }

  if (hasFrog) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <Loading />
        <p className="text-gray-500 mt-4">{tr('正在进入青蛙详情...', 'Redirecting to frog detail...')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">{tr('认领你的青蛙蛋', 'Claim Your Egg')}</h1>
        <p className="text-gray-500 mt-2">
          {tr(
            '每个钱包仅可拥有一只青蛙。完成认领后即可进入 Life / Travel / Memory 主链路。',
            'Each wallet can own only one frog. Claiming unlocks the Life / Travel / Memory main loop.'
          )}
        </p>
      </div>

      <EggIntroFlow
        onClaimSuccess={() => {
          navigate('/my-frog', { replace: true });
        }}
      />
    </div>
  );
}

export default EggClaimPage;
