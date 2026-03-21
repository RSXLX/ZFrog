import fs from 'fs';
import path from 'path';
import hre, { ethers } from 'hardhat';

type AddressBook = Record<string, Record<string, unknown>>;

const ADDRESSES_FILE = path.join(__dirname, '..', 'deployed-addresses.json');
const CONTRACTS_ENV_FILE = path.join(__dirname, '..', '.env');
const BACKEND_ENV_FILE = path.join(__dirname, '..', '..', 'backend', '.env');

const parseSalt = (raw?: string): string => {
  if (!raw) return '0';
  try {
    const value = raw.startsWith('0x') || raw.startsWith('0X') ? BigInt(raw) : BigInt(raw);
    return value.toString();
  } catch {
    return '0';
  }
};

const loadAddressBook = (): AddressBook => {
  if (!fs.existsSync(ADDRESSES_FILE)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(ADDRESSES_FILE, 'utf8')) as AddressBook;
  } catch {
    return {};
  }
};

const saveAddressBook = (addresses: AddressBook) => {
  fs.writeFileSync(ADDRESSES_FILE, JSON.stringify(addresses, null, 2));
};

const upsertEnv = (filePath: string, key: string, value: string) => {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  const source = fs.readFileSync(filePath, 'utf8');
  const line = `${key}=${value}`;
  const matcher = new RegExp(`^${key}=.*$`, 'm');
  const next = matcher.test(source)
    ? source.replace(matcher, line)
    : `${source.trimEnd()}\n${line}\n`;

  fs.writeFileSync(filePath, next);
  return true;
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const networkName = hre.network.name;
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const salt = parseSalt(process.env.ERC6551_SALT);
  const shouldWriteEnv = process.argv.includes('--write-env');

  console.log('='.repeat(64));
  console.log('Deploy ERC-6551 Registry + Account Implementation');
  console.log('='.repeat(64));
  console.log(`Network: ${networkName} (chainId=${chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Salt: ${salt}`);
  console.log('');

  const accountFactory = await ethers.getContractFactory('FrogTBAAccount');
  const accountImplementation = await accountFactory.deploy();
  await accountImplementation.waitForDeployment();
  const accountImplementationAddress = await accountImplementation.getAddress();
  console.log(`FrogTBAAccount deployed: ${accountImplementationAddress}`);

  const registryFactory = await ethers.getContractFactory('ERC6551Registry');
  const registry = await registryFactory.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log(`ERC6551Registry deployed: ${registryAddress}`);

  const configuredNft = process.env.ZETAFROG_NFT_ADDRESS;
  if (configuredNft && ethers.isAddress(configuredNft)) {
    const sampleTba = await (registry as any).account(
      accountImplementationAddress,
      BigInt(chainId),
      configuredNft,
      BigInt(1),
      BigInt(salt)
    );
    console.log(`Sample TBA(tokenId=1): ${sampleTba}`);
  } else {
    console.log('Sample TBA skipped: ZETAFROG_NFT_ADDRESS not configured.');
  }

  const addresses = loadAddressBook();
  addresses[networkName] = {
    ...(addresses[networkName] || {}),
    erc6551Registry: registryAddress,
    erc6551AccountImplementation: accountImplementationAddress,
    erc6551Salt: salt,
    erc6551UpdatedAt: new Date().toISOString(),
  };
  saveAddressBook(addresses);
  console.log(`Updated address book: ${ADDRESSES_FILE}`);

  if (shouldWriteEnv) {
    const targets = [
      {
        filePath: CONTRACTS_ENV_FILE,
        label: 'contracts/.env',
      },
      {
        filePath: BACKEND_ENV_FILE,
        label: 'backend/.env',
      },
    ];

    for (const target of targets) {
      const writtenRegistry = upsertEnv(target.filePath, 'ERC6551_REGISTRY_ADDRESS', registryAddress);
      const writtenImpl = upsertEnv(target.filePath, 'ERC6551_ACCOUNT_IMPLEMENTATION', accountImplementationAddress);
      const writtenSalt = upsertEnv(target.filePath, 'ERC6551_SALT', salt);

      if (writtenRegistry || writtenImpl || writtenSalt) {
        console.log(`Wired ${target.label}`);
      } else {
        console.log(`Skipped ${target.label} (file not found)`);
      }
    }
  }

  console.log('\nApply to backend env:');
  console.log(`ERC6551_REGISTRY_ADDRESS=${registryAddress}`);
  console.log(`ERC6551_ACCOUNT_IMPLEMENTATION=${accountImplementationAddress}`);
  console.log(`ERC6551_SALT=${salt}`);
  console.log('\nUse --write-env to auto-update contracts/.env and backend/.env');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
