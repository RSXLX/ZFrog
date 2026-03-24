import { apiClient } from '../../lib/api/client';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export interface SendMessageResponse {
  sessionId: number;
  reply: {
    content: string;
    intent: string;
    data?: any;
  };
  frogMood: string;
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  createdAt: string;
}

export interface ChatHistoryResponse {
  messages: ChatMessage[];
}

export interface ChatSession {
  id: number;
  frogId: number;
  frogName: string;
  lastMessage: string;
  updatedAt: string;
}

export interface SessionsResponse {
  sessions: ChatSession[];
}

async function resolveOwnerAddress(): Promise<string> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    return ZERO_ADDRESS;
  }

  try {
    const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
    if (Array.isArray(accounts) && accounts.length > 0) {
      return accounts[0];
    }
  } catch (error) {
    console.warn('Failed to get wallet address:', error);
  }

  return ZERO_ADDRESS;
}

class ChatFeatureApi {
  async sendMessage(
    frogId: number,
    message: string,
    sessionId?: number
  ): Promise<SendMessageResponse> {
    if (!frogId || !message) {
      throw new Error('Missing required parameters: frogId or message');
    }

    const ownerAddress = await resolveOwnerAddress();
    return apiClient.postData<SendMessageResponse>('/chat/message', {
      frogId,
      message,
      sessionId,
      ownerAddress,
    });
  }

  async getChatHistory(sessionId: number): Promise<ChatHistoryResponse> {
    return apiClient.getData<ChatHistoryResponse>(`/chat/history/${sessionId}`);
  }

  async getUserSessions(): Promise<SessionsResponse> {
    return apiClient.getData<SessionsResponse>('/chat/sessions');
  }

  async createSession(frogId: number): Promise<{ sessionId: number; frogId: number; createdAt: string }> {
    return apiClient.postData<{ sessionId: number; frogId: number; createdAt: string }>(
      '/chat/session',
      { frogId }
    );
  }

  sendMessageStream(
    frogId: number,
    message: string,
    sessionId?: number,
    onChunk?: (chunk: string) => void,
    onComplete?: (data: { sessionId: number; intent: string; frogMood: string }) => void,
    onError?: (error: string) => void
  ): AbortController {
    const controller = new AbortController();

    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

    resolveOwnerAddress()
      .then((ownerAddress) =>
        fetch(`${baseUrl}/chat/message/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ frogId, message, sessionId, ownerAddress }),
          signal: controller.signal,
        })
      )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Stream request failed');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No reader available');
        }

        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;

            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === 'chunk' && onChunk) {
                onChunk(event.data.content);
              } else if (event.type === 'done' && onComplete) {
                onComplete(event.data);
              } else if (event.type === 'error' && onError) {
                onError(event.data.message);
              }
            } catch (error) {
              console.warn('Failed to parse SSE event:', error);
            }
          }
        }
      })
      .catch((error) => {
        if (error.name !== 'AbortError' && onError) {
          onError(error.message);
        }
      });

    return controller;
  }
}

export const chatFeatureApi = new ChatFeatureApi();
