import { config } from '../config';
import { logger } from '../utils/logger';
import { GeneratedJournal } from './ai.service';

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
    private pinataApiKey: string;
    private pinataSecretKey: string;
    
    constructor() {
        this.pinataApiKey = config.PINATA_API_KEY;
        this.pinataSecretKey = config.PINATA_SECRET_KEY;
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
        logger.info(`Uploading journal to IPFS for frog ${frogId}`);
        
        const metadata: JournalMetadata = {
            name: `${frogName}的旅行日记 #${Date.now()}`,
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
        
        // 如果没有配置 Pinata，返回模拟的 IPFS hash
        if (!this.pinataApiKey || !this.pinataSecretKey) {
            logger.warn('Pinata not configured, returning mock IPFS hash');
            const mockHash = `Qm${Buffer.from(JSON.stringify(metadata)).toString('base64').slice(0, 44)}`;
            return `ipfs://${mockHash}`;
        }
        
        try {
            const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'pinata_api_key': this.pinataApiKey,
                    'pinata_secret_api_key': this.pinataSecretKey,
                },
                body: JSON.stringify({
                    pinataContent: metadata,
                    pinataMetadata: {
                        name: `zetafrog-journal-${frogId}-${Date.now()}`,
                    },
                }),
            });
            
            if (!response.ok) {
                throw new Error(`Pinata upload failed: ${response.statusText}`);
            }
            
            const result = await response.json() as { IpfsHash: string };
            const ipfsHash = result.IpfsHash;
            logger.info(`Journal uploaded: ipfs://${ipfsHash}`);
            
            return `ipfs://${ipfsHash}`;
            
        } catch (error) {
            logger.error('IPFS upload failed:', error);
            // 返回模拟 hash 以便继续测试
            const mockHash = `Qm${Buffer.from(JSON.stringify(metadata)).toString('base64').slice(0, 44)}`;
            return `ipfs://${mockHash}`;
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
        const metadata = {
            name: name,
            description: `ZetaFrog 旅行纪念品 - ${rarity}`,
            image: this.getSouvenirImage(name, rarity),
            attributes: [
                { trait_type: 'Rarity', value: rarity },
                { trait_type: 'Frog ID', value: frogId },
                { trait_type: 'Minted At', value: new Date().toISOString() },
            ],
        };
        
        // 简化版：返回模拟 hash
        const mockHash = `Qm${Buffer.from(JSON.stringify(metadata)).toString('base64').slice(0, 44)}`;
        return `ipfs://${mockHash}`;
    }
    
    private getMoodImage(mood: string): string {
        const moodImages: Record<string, string> = {
            happy: 'ipfs://QmHappyFrog',
            excited: 'ipfs://QmExcitedFrog',
            thoughtful: 'ipfs://QmThoughtfulFrog',
            adventurous: 'ipfs://QmAdventurousFrog',
            tired: 'ipfs://QmTiredFrog',
        };
        return moodImages[mood] || moodImages.happy;
    }
    
    private getSouvenirImage(name: string, rarity: string): string {
        return `ipfs://QmSouvenir${rarity}`;
    }
}

export const ipfsService = new IPFSService();
