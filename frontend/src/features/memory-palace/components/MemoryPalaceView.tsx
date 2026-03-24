import type { MemoryPalaceLite } from '../api';
import { useI18n } from '../../../i18n';

interface MemoryPalaceViewProps {
  memoryPalace: MemoryPalaceLite | null;
  loading?: boolean;
  onOpenFull?: () => void;
}

export function MemoryPalaceView({
  memoryPalace,
  loading = false,
  onOpenFull,
}: MemoryPalaceViewProps) {
  const { tr } = useI18n();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800">
          {tr('🧠 记忆空间', '🧠 Memory Palace')}
        </h3>
        {onOpenFull ? (
          <button
            type="button"
            onClick={onOpenFull}
            className="text-xs font-medium text-slate-500 transition hover:text-slate-700"
          >
            {tr('查看详情', 'Open')}
          </button>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">{tr('正在加载记忆空间...', 'Loading memory palace...')}</p>
      ) : null}

      {!loading && !memoryPalace ? (
        <p className="text-sm text-slate-500">
          {tr(
            '暂未生成记忆空间。完成一次旅行后将自动沉淀回忆。',
            'No memory palace yet. Complete a trip to generate one.'
          )}
        </p>
      ) : null}

      {!loading && memoryPalace ? (
        <div className="space-y-3">
          <div>
            <div className="text-sm font-semibold text-slate-700">
              {memoryPalace.title || tr('未命名记忆', 'Untitled Memory')}
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
              {memoryPalace.summary}
            </p>
          </div>

          {memoryPalace.highlights && memoryPalace.highlights.length > 0 ? (
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {tr('高光片段', 'Highlights')}
              </div>
              <ul className="space-y-1 text-sm text-slate-700">
                {memoryPalace.highlights.map((highlight, index) => (
                  <li key={`${highlight}-${index}`}>• {highlight}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {memoryPalace.souvenir ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <span className="font-semibold">{tr('纪念品', 'Souvenir')}: </span>
              {memoryPalace.souvenir.name || tr('未知纪念品', 'Unknown Souvenir')}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export default MemoryPalaceView;
