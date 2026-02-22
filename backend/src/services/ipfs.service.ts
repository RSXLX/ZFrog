// backend/src/services/ipfs.service.ts
// 统一的 IPFS 服务 - 合并了 JSON 元数据和二进制文件上传功能
import { config } from '../config';
import { logger } from '../utils/logger';
import { GeneratedJournal } from './ai.service';
import FormData from 'form-data';
import axios from 'axios';

// ============ 二进制上传相关接口 ============
export interface UploadFileInput {
  buffer: Buffer;
  filename: string;
  contentType?: string;
}

export interface UploadResult {
  ipfsHash: string;
  ipfsUrl: string;
  gatewayUrl: string;
  size: number;
}

// 声明 Pinata 类型
type PinataClient = {
    pinJSONToIPFS: (body: any, options?: any) => Promise<{ IpfsHash: string }>;
};

export interface JournalMetadata {
    name: string;
    description: string;
    image: string;
    attributes: Array<{
        trait_type: string;
        value: string | number;
    }>;
    journal: {
        title: string;
        content: string;
        mood: string;
        highlights: string[];
    };
}

class IPFSService {
    private pinata: PinataClient | null = null;
    private isInitialized = false;

    constructor() {
        this.initialize();
    }

    private async initialize(): Promise<void> {
        if (config.PINATA_API_KEY && config.PINATA_SECRET_KEY) {
            try {
                // 动态导入 Pinata SDK
                const PinataSDK = (await import('@pinata/sdk')).default;
                this.pinata = new PinataSDK({
                    pinataApiKey: config.PINATA_API_KEY,
                    pinataSecretApiKey: config.PINATA_SECRET_KEY,
                }) as PinataClient;
                this.isInitialized = true;
                logger.info('IPFS service initialized with Pinata');
            } catch (error) {
                logger.warn('Failed to initialize Pinata:', error);
            }
        } else {
            logger.warn('IPFS service running in mock mode - no Pinata credentials');
        }
    }

    /**
     * 确保服务已初始化
     */
    private async ensureInitialized(): Promise<void> {
        if (!this.isInitialized && config.PINATA_API_KEY && config.PINATA_SECRET_KEY) {
            await this.initialize();
        }
    }

    /**
     * 上传旅行日记到 IPFS
     */
    async uploadJournal(
        frogName: string,
        frogId: number,
        journal: GeneratedJournal,
        travelDuration: number
    ): Promise<string> {
        await this.ensureInitialized();
        
        logger.info(`Uploading journal to IPFS for frog ${frogId}`);

        const metadata: JournalMetadata = {
            name: `${frogName}'s Travel Journal #${Date.now()}`,
            description: journal.title,
            image: this.getMoodImage(journal.mood),
            attributes: [
                { trait_type: 'Frog ID', value: frogId },
                { trait_type: 'Frog Name', value: frogName },
                { trait_type: 'Mood', value: journal.mood },
                { trait_type: 'Duration (hours)', value: travelDuration },
                { trait_type: 'Generated At', value: new Date().toISOString() },
            ],
            journal: {
                title: journal.title,
                content: journal.content,
                mood: journal.mood,
                highlights: journal.highlights,
            },
        };

        if (!this.isInitialized || !this.pinata) {
            // Mock mode: return a fake hash
            const mockHash = `mock-${frogId}-${Date.now()}`;
            logger.info(`Mock IPFS upload: ${mockHash}`);
            return `ipfs://${mockHash}`;
        }

        try {
            const result = await this.pinata.pinJSONToIPFS(metadata, {
                pinataMetadata: {
                    name: `zetafrog-journal-${frogId}-${Date.now()}`,
                },
            });
            const ipfsHash = result.IpfsHash;
            logger.info(`Journal uploaded: ipfs://${ipfsHash}`);
            return `ipfs://${ipfsHash}`;
        } catch (error) {
            logger.error('IPFS upload failed:', error);
            // Return mock hash on failure
            const fallbackHash = `fallback-${frogId}-${Date.now()}`;
            return `ipfs://${fallbackHash}`;
        }
    }

    /**
     * 上传纪念品元数据
     */
    async uploadSouvenirMetadata(
        souvenirId: number,
        name: string,
        rarity: string,
        frogId: number
    ): Promise<string> {
        await this.ensureInitialized();

        const metadata = {
            name: name,
            description: `A ${rarity} souvenir from ZetaFrog's travels`,
            image: this.getSouvenirImage(name, rarity),
            attributes: [
                { trait_type: 'Rarity', value: rarity },
                { trait_type: 'Frog ID', value: frogId },
                { trait_type: 'Minted At', value: new Date().toISOString() },
            ],
        };

        if (!this.isInitialized || !this.pinata) {
            const mockHash = `souvenir-mock-${souvenirId}`;
            return `ipfs://${mockHash}`;
        }

        try {
            const result = await this.pinata.pinJSONToIPFS(metadata, {
                pinataMetadata: {
                    name: `zetafrog-souvenir-${souvenirId}`,
                },
            });
            return `ipfs://${result.IpfsHash}`;
        } catch (error) {
            logger.error('Souvenir metadata upload failed:', error);
            return `ipfs://souvenir-fallback-${souvenirId}`;
        }
    }

    private getMoodImage(mood: string): string {
        // MVP: 使用预定义的图片占位符
        const moodImages: Record<string, string> = {
            happy: 'ipfs://QmHappyFrogPlaceholder',
            excited: 'ipfs://QmExcitedFrogPlaceholder',
            thoughtful: 'ipfs://QmThoughtfulFrogPlaceholder',
            adventurous: 'ipfs://QmAdventurousFrogPlaceholder',
            tired: 'ipfs://QmTiredFrogPlaceholder',
        };
        return moodImages[mood] || moodImages.happy;
    }

    private getSouvenirImage(_name: string, rarity: string): string {
        // MVP: 预定义图片占位符
        return `ipfs://QmSouvenir${rarity}Placeholder`;
    }

    // ============ 二进制文件上传 (从 ipfs-uploader.service.ts 合并) ============

    /**
     * 上传二进制文件到 Pinata IPFS (图片、视频等)
     */
    async uploadFile(input: UploadFileInput): Promise<UploadResult> {
        const { buffer, filename, contentType = 'image/png' } = input;
        
        logger.info(`[IPFS] 开始上传文件: ${filename} (${buffer.length} bytes)`);

        // Mock mode
        if (!config.PINATA_API_KEY || !config.PINATA_SECRET_KEY) {
            const mockHash = `mock-file-${Date.now()}`;
            logger.warn(`[IPFS] Mock mode - 返回假哈希: ${mockHash}`);
            return {
                ipfsHash: mockHash,
                ipfsUrl: `ipfs://${mockHash}`,
                gatewayUrl: `https://gateway.pinata.cloud/ipfs/${mockHash}`,
                size: buffer.length,
            };
        }

        // 创建 FormData
        const formData = new FormData();
        formData.append('file', buffer, {
            filename,
            contentType,
        });

        // 添加 Pinata 元数据
        const metadata = {
            name: `ZetaFrog Asset ${filename}`,
            keyvalues: {
                type: 'zetafrog-asset',
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
            const response = await axios.post(
                'https://api.pinata.cloud/pinning/pinFileToIPFS',
                formData,
                {
                    maxBodyLength: Infinity,
                    headers: {
                        'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
                        'pinata_api_key': config.PINATA_API_KEY,
                        'pinata_secret_api_key': config.PINATA_SECRET_KEY,
                    },
                    timeout: 60000, // 60秒超时
                }
            );

            const ipfsHash = response.data.IpfsHash;
            const size = response.data.PinSize || buffer.length;

            const result: UploadResult = {
                ipfsHash,
                ipfsUrl: `ipfs://${ipfsHash}`,
                gatewayUrl: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
                size,
            };

            logger.info(`[IPFS] 文件上传成功: ${ipfsHash}`);
            return result;

        } catch (error: any) {
            logger.error('[IPFS] 文件上传失败:', error.response?.data || error.message);
            throw new Error(`IPFS file upload failed: ${error.message}`);
        }
    }

    /**
     * 检查文件是否已存在于 IPFS（避免重复上传）
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

export const ipfsService = new IPFSService();