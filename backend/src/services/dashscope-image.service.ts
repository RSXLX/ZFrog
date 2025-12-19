import axios, { AxiosInstance } from 'axios';

// API 配置
const API_CONFIG = {
  baseUrl: 'https://dashscope.aliyuncs.com/api/v1',
  createTaskEndpoint: '/services/aigc/text2image/image-synthesis',
  queryTaskEndpoint: '/tasks',
};

// 模型配置
export const MODEL_CONFIG = {
  // ✅ 推荐：最快最便宜
  FLASH: {
    model: 'wan2.2-t2i-flash',
    price: 0.04,  // 元/张
    speed: '⚡⚡⚡⚡⚡',
    description: '极速版，速度最快，性价比最高',
  },
  // 高质量选择
  PLUS: {
    model: 'wan2.2-t2i-plus',
    price: 0.08,
    speed: '⚡⚡⚡',
    description: '专业版，质量更高',
  },
};

// 图片尺寸配置
export const SIZE_OPTIONS = {
  SQUARE_512: '512*512',     // NFT 标准
  SQUARE_1024: '1024*1024',  // 高清
  PORTRAIT: '720*1280',      // 竖版
  LANDSCAPE: '1280*720',     // 横版
};

// 请求参数接口
export interface GenerateImageRequest {
  prompt: string;
  negative_prompt?: string;
  model?: string;
  size?: string;
  n?: number;
  seed?: number;
  prompt_extend?: boolean;
  watermark?: boolean;
}

// 任务结果接口
export interface TaskResult {
  task_id: string;
  task_status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  results?: Array<{
    url: string;
    orig_prompt?: string;
    actual_prompt?: string;
  }>;
  task_metrics?: {
    TOTAL: number;
    SUCCEEDED: number;
    FAILED: number;
  };
  code?: string;
  message?: string;
}

export class DashScopeImageService {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: API_CONFIG.baseUrl,
      timeout: 120000, // 2分钟超时
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
    });
  }

  /**
   * 创建图片生成任务（异步）
   */
  async createTask(request: GenerateImageRequest): Promise<string> {
    const payload = {
      model: request.model || MODEL_CONFIG.FLASH.model,
      input: {
        prompt: request.prompt,
        negative_prompt: request.negative_prompt || '',
      },
      parameters: {
        size: request.size || SIZE_OPTIONS.SQUARE_512,
        n: request.n || 1,
        seed: request.seed,
        prompt_extend: request.prompt_extend ?? true,
        watermark: request.watermark ?? false,
      },
    };

    console.log(`[DashScope] 创建任务，模型: ${payload.model}`);
    console.log(`[DashScope] Prompt: ${request.prompt.substring(0, 100)}...`);

    const response = await this.client.post(
      API_CONFIG.createTaskEndpoint,
      payload,
      {
        headers: {
          'X-DashScope-Async': 'enable', // 必须：异步模式
        },
      }
    );

    if (response.data.output?.task_id) {
      console.log(`[DashScope] 任务创建成功: ${response.data.output.task_id}`);
      return response.data.output.task_id;
    }

    throw new Error(response.data.message || 'Failed to create task');
  }

  /**
   * 查询任务结果
   */
  async queryTask(taskId: string): Promise<TaskResult> {
    const response = await this.client.get(
      `${API_CONFIG.queryTaskEndpoint}/${taskId}`
    );

    return {
      task_id: response.data.output?.task_id,
      task_status: response.data.output?.task_status,
      results: response.data.output?.results,
      task_metrics: response.data.output?.task_metrics,
      code: response.data.output?.code,
      message: response.data.output?.message,
    };
  }

  /**
   * 等待任务完成（轮询）
   */
  async waitForCompletion(
    taskId: string,
    options: {
      maxAttempts?: number;
      intervalMs?: number;
      onProgress?: (status: string, attempt: number) => void;
    } = {}
  ): Promise<TaskResult> {
    const { 
      maxAttempts = 60,      // 最多等待 2 分钟
      intervalMs = 2000,     // 每 2 秒查询一次
      onProgress 
    } = options;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const result = await this.queryTask(taskId);

      onProgress?.(result.task_status, attempt);

      if (result.task_status === 'SUCCEEDED') {
        console.log(`[DashScope] 任务完成，耗时约 ${attempt * 2} 秒`);
        return result;
      }

      if (result.task_status === 'FAILED') {
        throw new Error(result.message || 'Task failed');
      }

      // 继续等待
      await this.sleep(intervalMs);
    }

    throw new Error('Task timeout');
  }

  /**
   * 一键生成图片（创建任务 + 等待完成）
   */
  async generateImage(request: GenerateImageRequest): Promise<{
    imageUrl: string;
    originalPrompt: string;
    expandedPrompt?: string;
  }> {
    // 1. 创建任务
    const taskId = await this.createTask(request);

    // 2. 等待完成
    const result = await this.waitForCompletion(taskId, {
      onProgress: (status, attempt) => {
        console.log(`[DashScope] 状态: ${status}, 轮询次数: ${attempt}`);
      },
    });

    // 3. 提取结果
    if (!result.results || result.results.length === 0) {
      throw new Error('No image generated');
    }

    const imageResult = result.results[0];
    
    return {
      imageUrl: imageResult.url,
      originalPrompt: imageResult.orig_prompt || request.prompt,
      expandedPrompt: imageResult.actual_prompt,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}