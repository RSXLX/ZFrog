import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FeatureGateState } from '../components/common/FeatureGateState';
import { buildMemoryPalacePath } from '../features/memory-palace/routes';
import { useFrogData } from '../hooks/useFrogData';
import { useMyFrog } from '../hooks/useMyFrog';

export const GardenPage: React.FC = () => {
  const { address: visitAddress } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const { frog: myFrog, loading: myFrogLoading, isConnected, hasFrog } = useMyFrog();
  const { frog: visitFrog, loading: visitFrogLoading } = useFrogData(visitAddress || null);
  const isVisiting = Boolean(visitAddress);
  const frog = isVisiting ? visitFrog : myFrog;
  const loading = isVisiting ? visitFrogLoading : myFrogLoading;

  useEffect(() => {
    if (!frog?.id) {
      return;
    }

    navigate(buildMemoryPalacePath(frog.id), { replace: true });
  }, [frog?.id, navigate]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-green-500" />
          <p className="text-gray-500">正在切换到记忆空间...</p>
        </div>
      </div>
    );
  }

  if (!isVisiting && !isConnected) {
    return (
      <FeatureGateState
        emoji="🔗"
        title="请先连接钱包"
        description="连接钱包后才能进入你的记忆空间。"
        actionLabel="返回首页"
        actionTo="/"
        className="h-[80vh]"
      />
    );
  }

  if (!isVisiting && !hasFrog) {
    return (
      <FeatureGateState
        emoji="🐣"
        title="还没有记忆空间"
        description="先铸造一只青蛙，空间、徽章和旅行功能才会完整开启。"
        actionLabel="立即铸造"
        actionTo="/?mint=true"
        secondaryLabel="返回首页"
        secondaryTo="/"
        className="h-[80vh]"
      />
    );
  }

  if (!frog) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-2xl">{isVisiting ? '🐸' : '🧠'}</p>
          <p className="text-gray-600">{isVisiting ? '找不到这只青蛙的记忆空间' : '暂时无法加载记忆空间'}</p>
          <button
            onClick={() => navigate(isVisiting ? '/friends' : '/')}
            className="mt-4 rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-600"
          >
            {isVisiting ? '返回好友列表' : '返回首页'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-green-500" />
        <p className="text-gray-500">正在进入记忆空间...</p>
      </div>
    </div>
  );
};

export default GardenPage;
