import { useI18n } from '../../../i18n';

interface TravelLike {
  id: number;
  status?: string;
  chainId?: number;
  targetWallet?: string;
  endTime?: string;
  completedAt?: string;
}

interface TravelSummaryCardProps {
  activeTravel?: TravelLike | null;
  lastTravel?: TravelLike | null;
  onOpenActive?: (travelId: number) => void;
  onOpenHistory?: () => void;
}

const shortAddress = (value?: string): string => {
  if (!value) return '--';
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

const formatTime = (value?: string): string => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString();
};

export function TravelSummaryCard({
  activeTravel = null,
  lastTravel = null,
  onOpenActive,
  onOpenHistory,
}: TravelSummaryCardProps) {
  const { tr } = useI18n();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-lg font-bold text-slate-800">
        {tr('🧭 旅行主线摘要', '🧭 Travel Loop Summary')}
      </h3>

      {activeTravel ? (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-blue-700">
              {tr('进行中', 'In Progress')}
            </span>
            <span className="text-xs text-blue-600">
              #{activeTravel.id}
            </span>
          </div>
          <div className="space-y-1 text-xs text-blue-800">
            <div>{tr('目标地址', 'Target')}: {shortAddress(activeTravel.targetWallet)}</div>
            <div>{tr('链 ID', 'Chain ID')}: {activeTravel.chainId ?? '--'}</div>
            <div>{tr('预计结束', 'ETA')}: {formatTime(activeTravel.endTime)}</div>
          </div>
          {onOpenActive ? (
            <button
              type="button"
              onClick={() => onOpenActive(activeTravel.id)}
              className="mt-3 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
            >
              {tr('查看当前旅行', 'Open Active Travel')}
            </button>
          ) : null}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
          {tr('当前没有进行中的旅行。', 'No active travel right now.')}
        </div>
      )}

      {lastTravel ? (
        <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-emerald-700">
              {tr('最近一次完成', 'Latest Completed')}
            </span>
            <span className="text-xs text-emerald-600">#{lastTravel.id}</span>
          </div>
          <div className="space-y-1 text-xs text-emerald-800">
            <div>{tr('状态', 'Status')}: {lastTravel.status || '--'}</div>
            <div>{tr('目标地址', 'Target')}: {shortAddress(lastTravel.targetWallet)}</div>
            <div>{tr('完成时间', 'Completed At')}: {formatTime(lastTravel.completedAt)}</div>
          </div>
          {onOpenHistory ? (
            <button
              type="button"
              onClick={onOpenHistory}
              className="mt-3 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              {tr('查看旅行历史', 'Open Travel History')}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export default TravelSummaryCard;
