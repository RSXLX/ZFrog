import { disconnectDatabase } from '../database';
import { relationshipAttestationOnchainAdapter } from '../modules/web3/attestation-onchain.adapter';

const getArgValue = (flag: string): string | undefined => {
  const arg = process.argv.slice(2).find((entry) => entry.startsWith(`${flag}=`));
  if (!arg) {
    return undefined;
  }
  return arg.slice(flag.length + 1);
};

const hasFlag = (flag: string): boolean => process.argv.slice(2).includes(flag);

async function main() {
  const attestationId = getArgValue('--attestation-id');
  const txHash = getArgValue('--tx-hash');
  const limitArg = getArgValue('--limit');
  const limit = limitArg ? Number(limitArg) : undefined;
  const includeFailed = hasFlag('--include-failed');
  const force = hasFlag('--force');

  if (txHash) {
    const trace = await relationshipAttestationOnchainAdapter.findTraceByTxHash(txHash);
    console.log(
      JSON.stringify(
        {
          txHash,
          trace,
        },
        null,
        2
      )
    );
    return;
  }

  if (attestationId) {
    const result = await relationshipAttestationOnchainAdapter.submitByAttestationId({
      attestationId,
      force,
      source: 'script.replay-attestations-onchain',
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const replayResult = await relationshipAttestationOnchainAdapter.replayPendingAttestations({
    limit,
    includeFailed,
    force,
    source: 'script.replay-attestations-onchain',
  });
  console.log(JSON.stringify(replayResult, null, 2));
}

main()
  .catch((error) => {
    console.error('[AttestationReplay] Failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
