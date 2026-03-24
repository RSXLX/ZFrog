import { createHash } from 'crypto';

export const V2_CHAT_PROMPT_KIT_VERSION = '2026-03-23.prompt-kit.v1' as const;
export const V2_CHAT_SYSTEM_PROMPT_VERSION = '2026-03-23.chat-system.v1' as const;
export const V2_CHAT_RESPONSE_PROMPT_VERSION = '2026-03-23.chat-response.v1' as const;
export const V2_CHAT_MEMORY_TRACE_VERSION = '2026-03-23.chat-memory.v1' as const;
export const V2_CHAT_MEMORY_SUMMARY_TYPE = 'RELATIONSHIP_V1' as const;

export interface PromptTemplateTrace {
  templateId: string;
  templateVersion: string;
  fingerprint: string;
  variables: Record<string, unknown>;
}

export interface PromptKitTrace {
  promptKitVersion: string;
  systemPrompt: PromptTemplateTrace;
  responsePrompt: PromptTemplateTrace;
}

const digest = (value: string): string =>
  createHash('sha256').update(value).digest('hex').slice(0, 24);

const trimPreview = (value: string, max = 180): string => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) {
    return normalized;
  }
  return `${normalized.slice(0, max - 1)}…`;
};

const normalizeIntent = (intent: string): string => {
  const knownIntents = new Set<string>([
    'price_query',
    'asset_query',
    'frog_status',
    'travel_info',
    'start_travel',
    'travel_stats',
    'friend_list',
    'friend_add',
    'friend_visit',
    'souvenirs_query',
    'badges_query',
    'garden_query',
    'messages_query',
    'navigate',
    'help',
    'chitchat',
  ]);

  if (knownIntents.has(intent)) {
    return intent;
  }
  return 'unknown';
};

export const buildPromptKitTrace = (input: {
  frogName: string;
  personality: string;
  userMessage: string;
  intent: string;
  sessionId: number;
  messageCountHint: number;
}): PromptKitTrace => {
  const normalizedIntent = normalizeIntent(input.intent);
  const userMessagePreview = trimPreview(input.userMessage);

  return {
    promptKitVersion: V2_CHAT_PROMPT_KIT_VERSION,
    systemPrompt: {
      templateId: 'chat/system.prompt',
      templateVersion: V2_CHAT_SYSTEM_PROMPT_VERSION,
      fingerprint: digest(`${input.frogName}|${input.personality}`),
      variables: {
        frogName: input.frogName,
        personality: input.personality,
      },
    },
    responsePrompt: {
      templateId: 'chat/response.prompt',
      templateVersion: V2_CHAT_RESPONSE_PROMPT_VERSION,
      fingerprint: digest(`${normalizedIntent}|${userMessagePreview}`),
      variables: {
        intent: normalizedIntent,
        userMessagePreview,
        sessionId: input.sessionId,
        messageCountHint: input.messageCountHint,
      },
    },
  };
};

export const summarizeMemoryForTrace = (summaryText: string): { preview: string; fingerprint: string } => ({
  preview: trimPreview(summaryText, 200),
  fingerprint: digest(summaryText),
});
