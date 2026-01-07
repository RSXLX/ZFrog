/**
 * IPFS Service - IPFS 上传服务
 * 
 * 功能:
 * - 上传文件到 IPFS (通过 Pinata/NFT.Storage)
 * - 获取 IPFS 网关 URL
 */

// 默认使用 Pinata，也可以切换到 NFT.Storage
const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY || '';
const PINATA_SECRET_KEY = import.meta.env.VITE_PINATA_SECRET_KEY || '';
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT || '';

const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
];

export interface UploadResult {
  success: boolean;
  ipfsHash?: string;
  ipfsUrl?: string;
  error?: string;
}

export interface PhotoMetadata {
  name: string;
  description: string;
  image: string; // IPFS URI
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

/**
 * 上传文件到 IPFS
 */
export async function uploadToIpfs(file: File): Promise<UploadResult> {
  if (!PINATA_JWT && (!PINATA_API_KEY || !PINATA_SECRET_KEY)) {
    // 如果没有配置 Pinata，模拟返回
    console.warn('IPFS not configured, using mock upload');
    const mockHash = `Qm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    return {
      success: true,
      ipfsHash: mockHash,
      ipfsUrl: `${IPFS_GATEWAYS[0]}${mockHash}`,
    };
  }

  const formData = new FormData();
  formData.append('file', file);

  const pinataMetadata = JSON.stringify({
    name: file.name,
  });
  formData.append('pinataMetadata', pinataMetadata);

  try {
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: PINATA_JWT
        ? { Authorization: `Bearer ${PINATA_JWT}` }
        : {
            pinata_api_key: PINATA_API_KEY,
            pinata_secret_api_key: PINATA_SECRET_KEY,
          },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Upload failed');
    }

    const result = await response.json();
    
    return {
      success: true,
      ipfsHash: result.IpfsHash,
      ipfsUrl: `${IPFS_GATEWAYS[0]}${result.IpfsHash}`,
    };
  } catch (error: any) {
    console.error('IPFS upload failed:', error);
    return {
      success: false,
      error: error.message || 'Upload failed',
    };
  }
}

/**
 * 上传 JSON 元数据到 IPFS
 */
export async function uploadMetadataToIpfs(metadata: PhotoMetadata): Promise<UploadResult> {
  if (!PINATA_JWT && (!PINATA_API_KEY || !PINATA_SECRET_KEY)) {
    console.warn('IPFS not configured, using mock upload');
    const mockHash = `Qm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    return {
      success: true,
      ipfsHash: mockHash,
      ipfsUrl: `${IPFS_GATEWAYS[0]}${mockHash}`,
    };
  }

  try {
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(PINATA_JWT
          ? { Authorization: `Bearer ${PINATA_JWT}` }
          : {
              pinata_api_key: PINATA_API_KEY,
              pinata_secret_api_key: PINATA_SECRET_KEY,
            }),
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: {
          name: `${metadata.name}-metadata.json`,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Metadata upload failed');
    }

    const result = await response.json();

    return {
      success: true,
      ipfsHash: result.IpfsHash,
      ipfsUrl: `${IPFS_GATEWAYS[0]}${result.IpfsHash}`,
    };
  } catch (error: any) {
    console.error('IPFS metadata upload failed:', error);
    return {
      success: false,
      error: error.message || 'Upload failed',
    };
  }
}

/**
 * 从 Blob/DataURL 创建 File
 */
export async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type });
}

/**
 * 获取 IPFS 网关 URL
 */
export function getIpfsGatewayUrl(ipfsHash: string, gatewayIndex = 0): string {
  return `${IPFS_GATEWAYS[gatewayIndex % IPFS_GATEWAYS.length]}${ipfsHash}`;
}

/**
 * 将 ipfs:// URI 转换为 HTTP 网关 URL
 */
export function ipfsUriToHttpUrl(ipfsUri: string): string {
  if (ipfsUri.startsWith('ipfs://')) {
    const hash = ipfsUri.replace('ipfs://', '');
    return getIpfsGatewayUrl(hash);
  }
  return ipfsUri;
}

export const ipfsService = {
  uploadToIpfs,
  uploadMetadataToIpfs,
  dataUrlToFile,
  getIpfsGatewayUrl,
  ipfsUriToHttpUrl,
};

export default ipfsService;
