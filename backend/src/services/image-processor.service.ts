import sharp from 'sharp';
import axios from 'axios';

export interface ProcessImageInput {
  imageUrl: string;      // 图片 URL
  targetWidth?: number;  // 目标宽度
  targetHeight?: number; // 目标高度
  format?: 'png' | 'jpeg' | 'webp'; // 输出格式
  quality?: number;      // 质量 (1-100)
}

export interface ProcessImageResult {
  buffer: Buffer;
  fileSize: number;
  width: number;
  height: number;
  format: string;
}

export class ImageProcessorService {
  /**
   * 下载并处理图片
   */
  async processImage(input: ProcessImageInput): Promise<ProcessImageResult> {
    const {
      imageUrl,
      targetWidth = 512,
      targetHeight = 512,
      format = 'png',
      quality = 90,
    } = input;

    console.log(`[ImageProcessor] 开始处理: ${imageUrl}`);

    // 1. 下载图片
    const response = await axios.get(imageUrl, {
      responseType: 'stream',
      timeout: 30000,
    });

    // 2. 使用 Sharp 处理图片
    let processor = sharp(response.data);

    // 3. 调整尺寸（保持宽高比）
    processor = processor.resize(targetWidth, targetHeight, {
      fit: 'cover',
      position: 'center',
    });

    // 4. 转换格式
    switch (format) {
      case 'png':
        processor = processor.png({
          quality,
          compressionLevel: 9,
        });
        break;
      case 'jpeg':
        processor = processor.jpeg({
          quality,
        });
        break;
      case 'webp':
        processor = processor.webp({
          quality,
        });
        break;
    }

    // 5. 处理并获取结果
    const buffer = await processor.toBuffer();
    const metadata = await sharp(buffer).metadata();

    console.log(`[ImageProcessor] 处理完成: ${metadata.width}x${metadata.height}, ${buffer.length} bytes`);

    return {
      buffer,
      fileSize: buffer.length,
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || format,
    };
  }

  /**
   * 批量处理图片
   */
  async processBatch(images: ProcessImageInput[]): Promise<ProcessImageResult[]> {
    const results = await Promise.allSettled(
      images.map(img => this.processImage(img))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`[ImageProcessor] 处理失败 ${index}: ${result.reason}`);
        throw result.reason;
      }
    });
  }
}