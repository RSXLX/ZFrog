import { disconnectDatabase, prisma } from '../database';
import { memorySummaryService } from '../modules/soul/memory-summary.service';

const getArgValue = (flag: string): string | undefined => {
  const arg = process.argv.slice(2).find((entry) => entry.startsWith(`${flag}=`));
  if (!arg) {
    return undefined;
  }
  return arg.slice(flag.length + 1);
};

const hasFlag = (flag: string): boolean => process.argv.slice(2).includes(flag);

const toPositiveInt = (value?: string): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return undefined;
  return parsed;
};

async function main() {
  const frogId = toPositiveInt(getArgValue('--frog-id'));
  const limit = toPositiveInt(getArgValue('--limit')) || 50;
  const summaryType = getArgValue('--summary-type');
  const dryRun = hasFlag('--dry-run');

  const targetFrogIds = frogId
    ? [frogId]
    : (
        await prisma.frog.findMany({
          orderBy: { updatedAt: 'desc' },
          take: limit,
          select: { id: true },
        })
      ).map((item) => item.id);

  const stats = {
    total: targetFrogIds.length,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  console.log(
    `[MemorySummary] start total=${stats.total} dryRun=${dryRun} summaryType=${summaryType || 'RELATIONSHIP_V1'}`
  );

  for (const id of targetFrogIds) {
    try {
      if (dryRun) {
        stats.skipped += 1;
        continue;
      }

      const result = await memorySummaryService.rebuildForFrog({
        frogId: id,
        ...(summaryType ? { summaryType } : {}),
        source: 'script.update-memory-summaries',
      });
      stats.updated += 1;
      console.log(
        `[MemorySummary] frogId=${id} summaryId=${result.id} updatedAt=${result.updatedAt}`
      );
    } catch (error) {
      stats.failed += 1;
      console.error(`[MemorySummary] frogId=${id} failed:`, error);
    }
  }

  console.log('[MemorySummary] done');
  console.table(stats);
}

main()
  .catch((error) => {
    console.error('[MemorySummary] fatal:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
