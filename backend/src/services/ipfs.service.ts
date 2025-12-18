// backend/src/services/ipfs.service.ts
import { config } from '../config';
import { logger } from '../utils/logger';
import { GeneratedJournal } from './ai.service';

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
}

export const ipfsService = new IPFSService();