/**
 * @deprecated 此服务已废弃，请使用统一的 ipfs.service.ts
 * 功能已合并到 ipfsService.uploadFile() 方法中
 * 
 * 迁移指南：
 * - 原调用：new IPFSUploaderService().uploadImage({ buffer, filename })
 * - 新调用：ipfsService.uploadFile({ buffer, filename, contentType })
 */
import FormData from 'form-data';
import axios from 'axios';

export interface UploadImageInput {
  buffer: Buffer;
  filename: string;
  pinataApiKey?: string;
  pinataSecretKey?: string;
}

export interface UploadResult {
  ipfsHash: string;
  ipfsUrl: string;
  gatewayUrl: string;
  size: number;
}

export class IPFSUploaderService {
  private pinataApiKey: string;
  private pinataSecretKey: string;

  constructor() {
    this.pinataApiKey = process.env.PINATA_API_KEY || '';
    this.pinataSecretKey = process.env.PINATA_SECRET_KEY || '';
  }

  /**
   * 上传图片到 Pinata IPFS
   */
  async uploadImage(input: UploadImageInput): Promise<UploadResult> {
    const { buffer, filename } = input;

    console.log(`[IPFS] 开始上传: ${filename} (${buffer.length} bytes)`);

    // 创建 FormData
    const formData = new FormData();
    formData.append('file', buffer, {
      filename,
      contentType: 'image/png',
    });

    // 添加 Pinata 元数据
    const metadata = {
      name: `ZetaFrog Souvenir ${filename}`,
      keyvalues: {
        type: 'zetafrog-souvenir',
        timestamp: Date.now().toString(),
      },
    };
    formData.append('pinataMetadata', JSON.stringify(metadata));

    // 设置 Pinata 选项
    const pinataOptions = {
      cidVersion: 1,
      wrapWithDirectory: false,
    };
    formData.append('pinataOptions', JSON.stringify(pinataOptions));

    try {
      // 发送请求到 Pinata
      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        formData,
        {
          maxBodyLength: Infinity,
          headers: {
            'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
            'pinata_api_key': this.pinataApiKey,
            'pinata_secret_api_key': this.pinataSecretKey,
          },
          timeout: 60000, // 60秒超时
        }
      );

      const ipfsHash = response.data.IpfsHash;
      const size = response.data.PinSize;

      const result: UploadResult = {
        ipfsHash,
        ipfsUrl: `ipfs://${ipfsHash}`,
        gatewayUrl: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
        size,
      };

      console.log(`[IPFS] 上传成功: ${ipfsHash}`);
      return result;

    } catch (error: any) {
      console.error('[IPFS] 上传失败:', error.response?.data || error.message);
      throw new Error(`IPFS upload failed: ${error.message}`);
    }
  }

  /**
   * 上传 JSON 元数据到 IPFS
   */
  async uploadMetadata(metadata: any, filename?: string): Promise<UploadResult> {
    const buffer = Buffer.from(JSON.stringify(metadata, null, 2));
    const name = filename || `metadata-${Date.now()}.json`;

    console.log(`[IPFS] 上传元数据: ${name}`);

    const formData = new FormData();
    formData.append('file', buffer, {
      filename: name,
      contentType: 'application/json',
    });

    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        maxBodyLength: Infinity,
        headers: {
          'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
          'pinata_api_key': this.pinataApiKey,
          'pinata_secret_api_key': this.pinataSecretKey,
        },
        timeout: 30000,
      }
    );

    const ipfsHash = response.data.IpfsHash;

    return {
      ipfsHash,
      ipfsUrl: `ipfs://${ipfsHash}`,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
      size: buffer.length,
    };
  }

  /**
   * 检查文件是否已存在（避免重复上传）
   */
  async checkFileExists(ipfsHash: string): Promise<boolean> {
    try {
      const response = await axios.head(
        `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
        { timeout: 5000 }
      );
      return response.status === 200;
    } catch {
      return false;
    }
  }
}