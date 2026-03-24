import fs from 'fs';
import path from 'path';
import { ethers } from 'hardhat';

interface ReplayItem {
  attestationId: string;
  calldata: string;
  valueWei?: string;
}

const ATTACHMENT_ADDRESS =
  process.env.ATTESTATION_ADAPTER_ADDRESS || process.env.ATTESTATION_CONTRACT_ADDRESS || '';
const CALLDATA_FILE = process.env.ATTESTATION_CALLDATA_FILE || '';
const SINGLE_CALLDATA = process.env.ATTESTATION_CALLDATA || '';
const SINGLE_ATTESTATION_ID = process.env.ATTESTATION_ID || 'adhoc-attestation';
const MAX_ITEMS = Number(process.env.ATTESTATION_REPLAY_MAX || '20');

const normalizeHexData = (value: string): string => {
  const normalized = value.trim();
  if (!/^0x[0-9a-fA-F]+$/.test(normalized)) {
    throw new Error(`invalid calldata: ${value}`);
  }
  return normalized;
};

const loadReplayItems = (): ReplayItem[] => {
  if (CALLDATA_FILE) {
    const filePath = path.resolve(CALLDATA_FILE);
    if (!fs.existsSync(filePath)) {
      throw new Error(`ATTESTATION_CALLDATA_FILE not found: ${filePath}`);
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as ReplayItem[];
    if (!Array.isArray(parsed)) {
      throw new Error('ATTESTATION_CALLDATA_FILE must be a JSON array');
    }
    return parsed.map((item) => ({
      attestationId: String(item.attestationId || '').trim(),
      calldata: normalizeHexData(String(item.calldata || '')),
      ...(item.valueWei ? { valueWei: String(item.valueWei) } : {}),
    }));
  }

  if (SINGLE_CALLDATA.trim()) {
    return [
      {
        attestationId: SINGLE_ATTESTATION_ID,
        calldata: normalizeHexData(SINGLE_CALLDATA),
      },
    ];
  }

  throw new Error(
    'missing calldata source: set ATTESTATION_CALLDATA or ATTESTATION_CALLDATA_FILE'
  );
};

async function main() {
  if (!ATTACHMENT_ADDRESS || !ethers.isAddress(ATTACHMENT_ADDRESS)) {
    throw new Error('ATTESTATION_ADAPTER_ADDRESS is required and must be a valid address');
  }

  const [deployer] = await ethers.getSigners();
  const replayItems = loadReplayItems().slice(0, MAX_ITEMS);

  console.log('='.repeat(64));
  console.log('Attestation Replay Script');
  console.log('='.repeat(64));
  console.log(`Network: ${(await ethers.provider.getNetwork()).name}`);
  console.log(`Sender: ${deployer.address}`);
  console.log(`Adapter: ${ATTACHMENT_ADDRESS}`);
  console.log(`Items: ${replayItems.length}`);
  console.log('');

  for (const [index, item] of replayItems.entries()) {
    const tx = await deployer.sendTransaction({
      to: ATTACHMENT_ADDRESS,
      data: item.calldata,
      ...(item.valueWei ? { value: BigInt(item.valueWei) } : {}),
    });
    const receipt = await tx.wait();
    console.log(
      `[${index + 1}/${replayItems.length}] attestationId=${item.attestationId} txHash=${tx.hash} block=${receipt?.blockNumber}`
    );
  }

  console.log('\nReplay finished.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[replay-attestation] failed:', error);
    process.exit(1);
  });
