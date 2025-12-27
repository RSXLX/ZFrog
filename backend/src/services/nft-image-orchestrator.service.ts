import { PrismaClient, ImageGenerationStatus } from '@prisma/client';
import { DashScopeImageService, MODEL_CONFIG, SIZE_OPTIONS } from './dashscope-image.service';
import { PromptBuilderService } from './prompt-builder.service';
import { IPFSUploaderService } from './ipfs-uploader.service';
import { ImageProcessorService } from './image-processor.service';

const prisma = new PrismaClient();

export interface GenerateSouvenirImageInput {
  odosId: string;             // 青蛙 ID
  travelId: string;           // 旅行 ID
  souvenirId: string;         // 纪念品 ID
  souvenirType: string;       // 纪念品类型
  rarity: string;             // 稀有度
  chainId?: number;           // 链 ID
}

export class NFTImageOrchestratorService {
  private imageService: DashScopeImageService;
  private promptBuilder: PromptBuilderService;
  private ipfsUploader: IPFSUploaderService;
  private imageProcessor: ImageProcessorService;

  constructor() {
    const apiKey = process.env.QWEN_API_KEY!;
    this.imageService = new DashScopeImageService(apiKey);
    this.promptBuilder = new PromptBuilderService();
    this.ipfsUploader = new IPFSUploaderService();
    this.imageProcessor = new ImageProcessorService();
  }

  /**
   * 生成纪念品 NFT 图片（完整流程）
   */
  async generateSouvenirImage(input: GenerateSouvenirImageInput) {
    console.log(`[Orchestrator] 开始生成: ${input.souvenirType} - ${input.rarity}`);

    // 1. 创建数据库记录
    const record = await this.createRecord(input);

    try {
      // 2. 构建 Prompt
      const { prompt, negative_prompt } = this.promptBuilder.buildPrompt({
        souvenirType: input.souvenirType,
        rarity: input.rarity,
        chainId: input.chainId,
      });

      await this.updateRecord(record.id, {
        prompt,
        negativePrompt: negative_prompt,
        status: ImageGenerationStatus.GENERATING,
      });

      // 3. 调用 AI 生成图片
      console.log(`[Orchestrator] 调用 AI 生成...`);
      const result = await this.imageService.generateImage({
        prompt,
        negative_prompt,
        model: MODEL_CONFIG.FLASH.model,
        size: SIZE_OPTIONS.SQUARE_512,
        n: 1,
        prompt_extend: true,
        watermark: false,
        seed: this.generateSeed(input),
      });

      await this.updateRecord(record.id, {
        imageUrl: result.imageUrl,
        actualPrompt: result.expandedPrompt,
        status: ImageGenerationStatus.PROCESSING,
        generatedAt: new Date(),
      });

      // 4. 下载并处理图片
      console.log(`[Orchestrator] 处理图片...`);
      const processed = await this.imageProcessor.processImage({
        imageUrl: result.imageUrl,
        targetWidth: 512,
        targetHeight: 512,
        format: 'png',
      });

      // 5. 上传到 IPFS
      console.log(`[Orchestrator] 上传 IPFS...`);
      await this.updateRecord(record.id, {
        status: ImageGenerationStatus.UPLOADING,
      });

      const ipfsResult = await this.ipfsUploader.uploadImage({
        buffer: processed.buffer,
        filename: `zetafrog-${input.souvenirType}-${input.rarity}-${Date.now()}.png`,
      });

      // 6. 更新记录为完成
      const finalRecord = await this.updateRecord(record.id, {
        ipfsHash: ipfsResult.ipfsHash,
        ipfsUrl: ipfsResult.ipfsUrl,
        gatewayUrl: ipfsResult.gatewayUrl,
        fileSize: processed.fileSize,
        status: ImageGenerationStatus.COMPLETED,
        uploadedAt: new Date(),
      });

      // 7. 同步到 Souvenir 表（如果存在）
      try {
        const tokenId = parseInt(input.souvenirId);
        if (!isNaN(tokenId)) {
          const souvenir = await prisma.souvenir.findFirst({
            where: { tokenId },
          });

          if (souvenir) {
            console.log(`[Orchestrator] 更新 Souvenir ${tokenId} 的 metadataUri`);
            await prisma.souvenir.update({
              where: { id: souvenir.id },
              data: { metadataUri: ipfsResult.ipfsUrl },
            });
          }
        }
      } catch (err) {
        console.warn(`[Orchestrator] 同步到 Souvenir 表失败: ${err instanceof Error ? err.message : String(err)}`);
      }

      console.log(`[Orchestrator] ✅ 完成: ${ipfsResult.ipfsHash}`);

      return {
        success: true,
        record: finalRecord,
        imageUrl: ipfsResult.gatewayUrl,
        ipfsHash: ipfsResult.ipfsHash,
      };

    } catch (error: any) {
      console.error(`[Orchestrator] ❌ 失败: ${error.message}`);

      await this.updateRecord(record.id, {
        status: ImageGenerationStatus.FAILED,
        errorMessage: error.message,
        retryCount: { increment: 1 },
      });

      return {
        success: false,
        error: error.message,
        record,
      };
    }
  }

  /**
   * 批量生成图片
   */
  async generateBatch(inputs: GenerateSouvenirImageInput[]) {
    console.log(`[Orchestrator] 批量生成: ${inputs.length} 个任务`);

    const results = await Promise.allSettled(
      inputs.map(input => this.generateSouvenirImage(input))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return { input: inputs[index], ...result.value };
      } else {
        return {
          input: inputs[index],
          success: false,
          error: result.reason.message,
        };
      }
    });
  }

  /**
   * 生成唯一种子
   */
  private generateSeed(input: GenerateSouvenirImageInput): number {
    const str = `${input.odosId}-${input.souvenirId}-${Date.now()}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash) % 2147483647;
  }

  private async createRecord(input: GenerateSouvenirImageInput) {
    return prisma.souvenirImage.create({
      data: {
        odosId: input.odosId,
        travelId: input.travelId,
        souvenirId: input.souvenirId,
        souvenirType: input.souvenirType,
        souvenirName: `${input.souvenirType}_${input.rarity}`,
        rarity: input.rarity,
        prompt: '',
        seed: 0,
        stylePreset: 'ZETAFROG_CARTOON',
        status: ImageGenerationStatus.PENDING,
      },
    });
  }

  private async updateRecord(id: string, data: any) {
    return prisma.souvenirImage.update({
      where: { id },
      data,
    });
  }
}