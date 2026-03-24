import type {
  V3MemoryPalaceContributionReadModel,
  V3MemoryPalaceWorldReadModel,
} from '../../../../../packages/shared/src';

interface MemoryWorldContributionFeedProps {
  world: V3MemoryPalaceWorldReadModel | null;
}

const contributionTypeStyles: Record<V3MemoryPalaceContributionReadModel['type'], string> = {
  WITNESS_NOTE: 'bg-sky-100 text-sky-700',
  RELIC_PLACEMENT: 'bg-indigo-100 text-indigo-700',
  PHOTO: 'bg-pink-100 text-pink-700',
  MEMORY_FRAGMENT: 'bg-amber-100 text-amber-700',
};

export function MemoryWorldContributionFeed({ world }: MemoryWorldContributionFeedProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Contribution Feed</h3>
      <p className="mt-1 text-sm text-slate-600">
        Recent co-build timeline with actor trace and contribution type.
      </p>

      {!world ? (
        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Load one world first to inspect contribution feed.
        </p>
      ) : null}

      {world && world.contributions.length === 0 ? (
        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          No contributions yet.
        </p>
      ) : null}

      {world && world.contributions.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {world.contributions.map((contribution) => (
            <li
              key={contribution.id}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    contributionTypeStyles[contribution.type] || 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {contribution.type}
                </span>
                <p className="text-xs text-slate-500">
                  {new Date(contribution.createdAt).toLocaleString()}
                </p>
              </div>

              <p className="mt-2 text-sm text-slate-800">{contribution.content}</p>
              <p className="mt-1 text-xs text-slate-500">
                {contribution.appId} · {contribution.actor}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
