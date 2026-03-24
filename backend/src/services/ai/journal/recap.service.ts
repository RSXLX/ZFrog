import { DiaryMood } from '@prisma/client';

export interface TravelRecapInput {
  frogName: string;
  targetChain: string;
  chainId: number;
  journalTitle?: string | null;
  journalContent?: string | null;
  legacyDiary?: string | null;
  mood?: string | DiaryMood | null;
  discoveries?: Array<{ title: string; description?: string | null }>;
  souvenirName?: string | null;
  completedAt?: Date | null;
}

export interface TravelRecapOutput {
  title: string;
  summary: string;
  mood: string;
  highlights: string[];
  journal: {
    title: string;
    content: string;
    mood: string;
  };
}

const normalizeMood = (mood?: string | null): string => {
  if (!mood) return 'PEACEFUL';
  const upper = mood.toUpperCase();
  const allowed = ['HAPPY', 'CURIOUS', 'SURPRISED', 'PEACEFUL', 'EXCITED', 'SLEEPY'];
  return allowed.includes(upper) ? upper : 'PEACEFUL';
};

const trimSentence = (text: string, maxLength = 140): string => {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1)}…`;
};

const safeChainLabel = (targetChain: string, chainId: number): string => {
  if (targetChain && targetChain.trim().length > 0) {
    return targetChain;
  }
  return `CHAIN_${chainId}`;
};

const extractJournal = (input: TravelRecapInput): { title: string; content: string; mood: string } => {
  const fallbackTitle = `${input.frogName} 的旅行回顾`;
  const fallbackContent = `${input.frogName} 完成了一次新的旅行，带回了新的见闻。`;
  const mood = normalizeMood(input.mood?.toString());

  if (input.journalContent) {
    try {
      const parsed = JSON.parse(input.journalContent);
      if (parsed && typeof parsed === 'object' && typeof parsed.content === 'string') {
        return {
          title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title : fallbackTitle,
          content: parsed.content.trim(),
          mood: normalizeMood(typeof parsed.mood === 'string' ? parsed.mood : mood),
        };
      }
    } catch {
      // Keep plain string fallback.
    }

    return {
      title: input.journalTitle?.trim() || fallbackTitle,
      content: input.journalContent.trim(),
      mood,
    };
  }

  if (input.legacyDiary && input.legacyDiary.trim()) {
    return {
      title: input.journalTitle?.trim() || fallbackTitle,
      content: input.legacyDiary.trim(),
      mood,
    };
  }

  return {
    title: input.journalTitle?.trim() || fallbackTitle,
    content: fallbackContent,
    mood,
  };
};

export class RecapService {
  generateRecap(input: TravelRecapInput): TravelRecapOutput {
    const chainLabel = safeChainLabel(input.targetChain, input.chainId);
    const journal = extractJournal(input);

    const highlights = new Set<string>();
    if (input.souvenirName) {
      highlights.add(`带回纪念品：${input.souvenirName}`);
    }

    for (const discovery of input.discoveries || []) {
      if (discovery?.title) {
        highlights.add(discovery.title);
      }
      if (highlights.size >= 3) {
        break;
      }
    }

    if (highlights.size === 0) {
      highlights.add(`完成 ${chainLabel} 的一次旅行`);
    }

    const summaryParts: string[] = [
      `${input.frogName} 完成了在 ${chainLabel} 的旅程。`,
      trimSentence(journal.content, 90),
    ];

    if (input.souvenirName) {
      summaryParts.push(`它带回了「${input.souvenirName}」。`);
    }

    return {
      title: journal.title || `${input.frogName} 的记忆片段`,
      summary: summaryParts.join(' '),
      mood: journal.mood,
      highlights: Array.from(highlights),
      journal,
    };
  }
}

export const recapService = new RecapService();
