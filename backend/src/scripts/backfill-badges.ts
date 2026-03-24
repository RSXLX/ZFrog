import { badgeMaintenanceService } from '../services/badge/badge-maintenance.service';
import { disconnectDatabase } from '../database';

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function getArgValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1 || index === args.length - 1) {
    return undefined;
  }
  return args[index + 1];
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = hasFlag(args, '--dry-run');
  const syncDefinitions = !hasFlag(args, '--skip-sync-definitions');
  const createRewards = !hasFlag(args, '--skip-rewards');
  const syncStats = !hasFlag(args, '--skip-stats');
  const all = hasFlag(args, '--all');
  const frogId = getArgValue(args, '--frog-id');
  const tokenId = getArgValue(args, '--token-id');
  const ownerAddress = getArgValue(args, '--owner-address');
  const limitArg = getArgValue(args, '--limit');
  const limit = limitArg ? Number(limitArg) : undefined;

  if (!all && !frogId && !tokenId && !ownerAddress) {
    console.log('Usage: ts-node src/scripts/backfill-badges.ts [--all | --frog-id <id> | --token-id <tokenId> | --owner-address <address>] [--dry-run] [--skip-sync-definitions] [--skip-rewards] [--skip-stats] [--limit <n>]');
    process.exit(1);
  }

  let summary;

  if (all) {
    summary = await badgeMaintenanceService.reconcileAllFrogs({
      dryRun,
      syncDefinitions,
      createRewards,
      syncStats,
      limit,
    });
  } else if (ownerAddress) {
    summary = await badgeMaintenanceService.reconcileOwnerBadges(ownerAddress, {
      dryRun,
      syncDefinitions,
      createRewards,
      syncStats,
      limit,
    });
  } else {
    const result = await badgeMaintenanceService.reconcileFrogBadges(
      {
        frogId: frogId ? Number(frogId) : undefined,
        tokenId: tokenId ? Number(tokenId) : undefined,
      },
      {
        dryRun,
        syncDefinitions,
        createRewards,
        syncStats,
      }
    );

    summary = {
      dryRun,
      frogsProcessed: 1,
      badgesUnlocked: result.unlockedBadges.length,
      rewardsCreated: result.createdRewards.length,
      statsSynced: result.statsSynced ? 1 : 0,
      results: [result],
    };
  }

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error('[BadgeBackfill] Failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
