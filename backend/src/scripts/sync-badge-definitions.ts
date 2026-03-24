import { badgeMaintenanceService } from '../services/badge/badge-maintenance.service';
import { disconnectDatabase } from '../database';

async function main() {
  const dryRun = process.argv.slice(2).includes('--dry-run');
  const result = await badgeMaintenanceService.syncDefinitions({ dryRun });
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error('[BadgeSync] Failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
