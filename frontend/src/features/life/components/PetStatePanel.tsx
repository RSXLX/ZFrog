import clsx from 'clsx';
import type { LifeReadModel } from '../../../lib/api/contracts';
import { useI18n } from '../../../i18n';

interface PetStatePanelProps {
  life: LifeReadModel | null;
  loading?: boolean;
  onRefresh?: () => void;
}

interface StatItem {
  key: keyof Pick<LifeReadModel, 'hunger' | 'happiness' | 'cleanliness' | 'health' | 'energy'>;
  labelZh: string;
  labelEn: string;
  emoji: string;
}

const STATS: StatItem[] = [
  { key: 'hunger', labelZh: '饱食度', labelEn: 'Hunger', emoji: '🍔' },
  { key: 'happiness', labelZh: '幸福度', labelEn: 'Happiness', emoji: '😊' },
  { key: 'cleanliness', labelZh: '清洁度', labelEn: 'Cleanliness', emoji: '🫧' },
  { key: 'health', labelZh: '健康度', labelEn: 'Health', emoji: '❤️' },
  { key: 'energy', labelZh: '活力度', labelEn: 'Energy', emoji: '⚡' },
];

const levelClass = (value: number): string => {
  if (value <= 20) return 'bg-red-500';
  if (value <= 50) return 'bg-amber-500';
  return 'bg-emerald-500';
};

export function PetStatePanel({ life, loading = false, onRefresh }: PetStatePanelProps) {
  const { tr } = useI18n();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800">{tr('🐸 当前生命状态', '🐸 Current Life State')}</h3>
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            className="text-xs font-medium text-slate-500 transition hover:text-slate-700"
          >
            {tr('刷新', 'Refresh')}
          </button>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">{tr('正在同步生命状态...', 'Syncing life state...')}</p>
      ) : null}

      {!loading && !life ? (
        <p className="text-sm text-slate-500">
          {tr('暂时无法读取状态，请稍后重试。', 'Unable to read life state for now. Please retry later.')}
        </p>
      ) : null}

      {!loading && life ? (
        <div className="space-y-3">
          {STATS.map((stat) => {
            const raw = Number(life[stat.key] || 0);
            const value = Math.max(0, Math.min(100, raw));
            return (
              <div key={stat.key}>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                  <span>
                    {stat.emoji} {tr(stat.labelZh, stat.labelEn)}
                  </span>
                  <span className="font-semibold text-slate-700">{value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={clsx('h-full rounded-full transition-all', levelClass(value))}
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            );
          })}

          <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
            <div
              className={clsx(
                'rounded-lg border px-2 py-1',
                life.isSick ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-slate-50 text-slate-600'
              )}
            >
              {life.isSick ? tr('生病中', 'Sick') : tr('状态正常', 'Healthy')}
            </div>
            <div
              className={clsx(
                'rounded-lg border px-2 py-1',
                life.needsClean
                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
              )}
            >
              {life.needsClean ? tr('需要清洁', 'Needs Cleaning') : tr('环境整洁', 'Clean')}
            </div>
            <div
              className={clsx(
                'rounded-lg border px-2 py-1',
                life.isDormant
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
              )}
            >
              {life.isDormant ? tr('冬眠中', 'Dormant') : tr('清醒中', 'Awake')}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-slate-600">
              {tr('心情', 'Mood')}: {life.mood}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default PetStatePanel;
