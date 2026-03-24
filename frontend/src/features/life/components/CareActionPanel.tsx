import { useState } from 'react';
import { lifeFeatureApi } from '../api';
import { useI18n } from '../../../i18n';

interface CareActionPanelProps {
  frogId: number;
  onStateChanged?: () => void | Promise<void>;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

type ActionKey = 'feed' | 'play' | 'clean' | 'heal' | 'rest';

export function CareActionPanel({
  frogId,
  onStateChanged,
  onSuccess,
  onError,
}: CareActionPanelProps) {
  const { tr } = useI18n();
  const [actionLoading, setActionLoading] = useState<ActionKey | null>(null);
  const [isResting, setIsResting] = useState(false);

  const runAction = async (
    key: ActionKey,
    execute: () => Promise<unknown>,
    message: { zh: string; en: string }
  ) => {
    try {
      setActionLoading(key);
      await execute();
      onSuccess?.(tr(message.zh, message.en));
      if (onStateChanged) {
        await onStateChanged();
      }
    } catch (error: any) {
      const text =
        error?.message ||
        tr('操作失败，请稍后重试', 'Action failed, please retry later');
      onError?.(text);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-lg font-bold text-slate-800">
        {tr('🛠 照顾操作', '🛠 Care Actions')}
      </h3>
      <p className="mb-4 text-xs text-slate-500">
        {tr(
          '优先调用 /api/v1/frogs/:frogId/care/*，与 life.command 单一路径对齐。',
          'Actions call /api/v1/frogs/:frogId/care/* and align with life.command write path.'
        )}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={actionLoading !== null}
          onClick={() =>
            runAction(
              'feed',
              () => lifeFeatureApi.feed(frogId, { foodType: 'BUG_BENTO', quantity: 1, source: 'i11_care_panel' }),
              { zh: '已喂食 BUG_BENTO', en: 'Fed with BUG_BENTO' }
            )
          }
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {actionLoading === 'feed' ? tr('喂食中...', 'Feeding...') : tr('喂食', 'Feed')}
        </button>

        <button
          type="button"
          disabled={actionLoading !== null}
          onClick={() =>
            runAction(
              'play',
              () => lifeFeatureApi.play(frogId, { gameType: 'guess', source: 'i11_care_panel' }),
              { zh: '已完成陪玩', en: 'Play completed' }
            )
          }
          className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {actionLoading === 'play' ? tr('玩耍中...', 'Playing...') : tr('陪玩', 'Play')}
        </button>

        <button
          type="button"
          disabled={actionLoading !== null}
          onClick={() =>
            runAction('clean', () => lifeFeatureApi.clean(frogId, { source: 'i11_care_panel' }), {
              zh: '已完成清洁',
              en: 'Cleaned',
            })
          }
          className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {actionLoading === 'clean' ? tr('清洁中...', 'Cleaning...') : tr('清洁', 'Clean')}
        </button>

        <button
          type="button"
          disabled={actionLoading !== null}
          onClick={() =>
            runAction('heal', () => lifeFeatureApi.heal(frogId, { source: 'i11_care_panel' }), {
              zh: '已完成治疗',
              en: 'Healed',
            })
          }
          className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {actionLoading === 'heal' ? tr('治疗中...', 'Healing...') : tr('治疗', 'Heal')}
        </button>
      </div>

      <button
        type="button"
        disabled={actionLoading !== null}
        onClick={() =>
          runAction(
            'rest',
            async () => {
              if (isResting) {
                await lifeFeatureApi.endRest(frogId, { source: 'i11_care_panel' });
                setIsResting(false);
              } else {
                await lifeFeatureApi.startRest(frogId, { source: 'i11_care_panel' });
                setIsResting(true);
              }
            },
            isResting
              ? { zh: '休息结束', en: 'Rest ended' }
              : { zh: '进入休息', en: 'Rest started' }
          )
        }
        className="mt-3 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {actionLoading === 'rest'
          ? tr('处理中...', 'Processing...')
          : isResting
            ? tr('结束休息', 'End Rest')
            : tr('开始休息', 'Start Rest')}
      </button>
    </section>
  );
}

export default CareActionPanel;
