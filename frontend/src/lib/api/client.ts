import { apiService } from '../../services/api';
import type { ApiEnvelope } from './contracts';
import { toApiClientError, unwrapApiEnvelope } from './errors';

export interface RequestOptions {
  params?: Record<string, unknown>;
}

class ApiClient {
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    try {
      return await apiService.get<T>(endpoint, options as any);
    } catch (error) {
      throw toApiClientError(error);
    }
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    try {
      return await apiService.post<T>(endpoint, body);
    } catch (error) {
      throw toApiClientError(error);
    }
  }

  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    try {
      return await apiService.put<T>(endpoint, body);
    } catch (error) {
      throw toApiClientError(error);
    }
  }

  async delete<T>(endpoint: string, body?: unknown): Promise<T> {
    try {
      return await apiService.delete<T>(endpoint, body);
    } catch (error) {
      throw toApiClientError(error);
    }
  }

  async getData<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const payload = await this.get<ApiEnvelope<T> | T>(endpoint, options);
    return unwrapApiEnvelope(payload);
  }

  async postData<T>(endpoint: string, body?: unknown): Promise<T> {
    const payload = await this.post<ApiEnvelope<T> | T>(endpoint, body);
    return unwrapApiEnvelope(payload);
  }

  async putData<T>(endpoint: string, body?: unknown): Promise<T> {
    const payload = await this.put<ApiEnvelope<T> | T>(endpoint, body);
    return unwrapApiEnvelope(payload);
  }

  async deleteData<T>(endpoint: string, body?: unknown): Promise<T> {
    const payload = await this.delete<ApiEnvelope<T> | T>(endpoint, body);
    return unwrapApiEnvelope(payload);
  }
}

export const apiClient = new ApiClient();
