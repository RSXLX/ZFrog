import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../../services/api';
import {
  DOMAIN_EVENT_CHANNEL,
  WS_EVENT_MESSAGE_CHANNEL,
  parseDomainEvent,
  parseDomainEventMessage,
} from '../../services/domainEvents';
import storage from '../../services/storage';

export interface DesktopFeedNotification {
  id: string;
  type: 'travel' | 'life' | 'ritual' | 'system';
  title: string;
  message: string;
  timestamp: number;
  source: 'event' | 'poll';
}

interface UseNotificationFeedOptions {
  frogTokenId: number | null;
  pollIntervalMs?: number;
}

interface UseNotificationFeedReturn {
  notifications: DesktopFeedNotification[];
  current: DesktopFeedNotification | null;
  addNotification: (notification: Omit<DesktopFeedNotification, 'id' | 'timestamp' | 'source'>) => void;
  dismissCurrent: () => void;
  refresh: () => Promise<void>;
}

const MAX_CACHE = 100;
const EVENT_DEDUP_WINDOW_MS = 1500;
const RELATIONSHIP_REMINDER_DEFAULT_THROTTLE_MS = 10 * 60 * 1000;
const RELATIONSHIP_REMINDER_MIN_THROTTLE_MS = 30 * 1000;
const COUNCIL_BRIEF_DEFAULT_THROTTLE_MS = 15 * 60 * 1000;
const COUNCIL_BRIEF_MIN_THROTTLE_MS = 60 * 1000;
const COUNCIL_PREF_SYNC_COOLDOWN_MS = 20 * 1000;
const COUNCIL_BRIEF_SEEN_CACHE_MAX = 120;

const buildId = () => `desktop_notif_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const toDesktopNotification = (input: {
  type: DesktopFeedNotification['type'];
  title: string;
  message: string;
  source: DesktopFeedNotification['source'];
}): DesktopFeedNotification => ({
  id: buildId(),
  type: input.type,
  title: input.title,
  message: input.message,
  source: input.source,
  timestamp: Date.now(),
});

const toEventNotification = (
  input: Omit<DesktopFeedNotification, 'id' | 'timestamp' | 'source'>
): DesktopFeedNotification => {
  return toDesktopNotification({
    ...input,
    source: 'event',
  });
};

const toRecord = (input: unknown): Record<string, unknown> | null => {
  if (!input || typeof input !== 'object') {
    return null;
  }
  return input as Record<string, unknown>;
};

const toPositiveInt = (input: unknown): number | null => {
  const value = Number(input);
  if (!Number.isInteger(value) || value <= 0) {
    return null;
  }
  return value;
};

const toShortLabel = (input: unknown, fallback: string): string => {
  if (typeof input !== 'string') {
    return fallback;
  }
  const normalized = input.trim();
  return normalized.length > 0 ? normalized : fallback;
};

const readRelationshipReminderConfig = () => {
  const settings = storage.getSettings();
  const notificationsEnabled = settings.notifications !== false;
  const relationshipEnabled = settings.relationshipAwareReminders !== false;
  const configuredThrottle = Number(settings.relationshipReminderThrottleMs);
  const throttleMs = Number.isFinite(configuredThrottle)
    ? Math.max(RELATIONSHIP_REMINDER_MIN_THROTTLE_MS, Math.floor(configuredThrottle))
    : RELATIONSHIP_REMINDER_DEFAULT_THROTTLE_MS;

  return {
    notificationsEnabled,
    relationshipEnabled,
    throttleMs,
  };
};

const readCouncilBriefReminderConfig = () => {
  const settings = storage.getSettings();
  const notificationsEnabled = settings.notifications !== false;
  const councilBriefEnabled = settings.councilBriefNotifications !== false;
  const configuredThrottle = Number(settings.councilBriefThrottleMs);
  const throttleMs = Number.isFinite(configuredThrottle)
    ? Math.max(COUNCIL_BRIEF_MIN_THROTTLE_MS, Math.floor(configuredThrottle))
    : COUNCIL_BRIEF_DEFAULT_THROTTLE_MS;

  return {
    notificationsEnabled,
    councilBriefEnabled,
    throttleMs,
  };
};

const mapDomainEventToNotification = (eventName: string, payload: unknown) => {
  const body = toRecord(payload);

  switch (eventName) {
    case 'TravelStarted': {
      const targetChain = typeof body?.targetChain === 'string' ? body.targetChain : null;
      return {
        type: 'travel' as const,
        title: '旅行开始',
        message: targetChain ? `你的青蛙已启程前往 ${targetChain}。` : '你的青蛙已经启程。',
      };
    }
    case 'TravelCompleted':
      return {
        type: 'travel' as const,
        title: '旅行完成',
        message: '旅行已完成，可查看旅途收获。',
      };
    case 'PetStateUpdated': {
      const mood = typeof body?.mood === 'string' ? body.mood : null;
      return {
        type: 'life' as const,
        title: '生命状态更新',
        message: mood ? `青蛙状态已刷新，当前心情：${mood}。` : '青蛙状态已刷新。',
      };
    }
    case 'BlessingCompleted':
      return {
        type: 'ritual' as const,
        title: '祈福完成',
        message: '收到了新的祈福反馈。',
      };
    default:
      return null;
  }
};

const mapRelationshipEventToNotification = (
  eventName: string,
  payload: unknown
): { title: string; message: string; throttleKey: string } | null => {
  const body = toRecord(payload);
  const familyName = toShortLabel(body?.familyName || body?.name, '新家庭');
  const communityId = toPositiveInt(body?.communityId);
  const role = toShortLabel(body?.role, 'member');
  const attestationType = toShortLabel(body?.attestationType, 'relationship');
  const counterpartyFrogId =
    toPositiveInt(body?.counterpartyFrogId) ||
    toPositiveInt(body?.objectFrogId) ||
    toPositiveInt(body?.subjectFrogId);

  switch (eventName) {
    case 'FamilyCreated':
      return {
        title: '关系网络启动',
        message: `家庭「${familyName}」已建立，关系记忆开始累计。`,
        throttleKey: `family-created:${familyName}`,
      };
    case 'FamilyMemberJoined':
      return {
        title: '家庭关系更新',
        message: counterpartyFrogId
          ? `成员青蛙 #${counterpartyFrogId} 已加入，建议聊天追问关系进展。`
          : '新成员加入家庭，关系上下文已更新。',
        throttleKey: `family-member-joined:${body?.familyId || familyName}`,
      };
    case 'CommunityJoined':
      return {
        title: '社区协作上线',
        message: communityId
          ? `青蛙已加入社区 #${communityId}（${role}），可以在聊天中追问协作关系。`
          : `社区加入成功（${role}），关系上下文已扩展。`,
        throttleKey: `community-joined:${communityId || role}`,
      };
    case 'RelationshipAttested':
      return {
        title: '关系证明更新',
        message: counterpartyFrogId
          ? `与青蛙 #${counterpartyFrogId} 的关系证明（${attestationType}）已记录。`
          : `新的关系证明（${attestationType}）已记录。`,
        throttleKey: `relationship-attested:${attestationType}:${counterpartyFrogId || 'na'}`,
      };
    case 'RelationshipMemoryUpdated':
    case 'MemorySummaryCreated':
    case 'MemorySummaryUpdated':
      return {
        title: '关系记忆已刷新',
        message: '关系上下文已同步，聊天可直接追问「我们最近关系如何？」',
        throttleKey: `relationship-memory:${eventName}`,
      };
    default:
      return null;
  }
};

export function useNotificationFeed({
  frogTokenId,
  pollIntervalMs = 30000,
}: UseNotificationFeedOptions): UseNotificationFeedReturn {
  const [notifications, setNotifications] = useState<DesktopFeedNotification[]>(() => {
    const cached = storage.getDesktopNotifications();
    return cached
      .map(item => ({
        id: item.id,
        type: (item.type as DesktopFeedNotification['type']) || 'system',
        title: item.title || '通知',
        message: item.message || '',
        source: 'poll' as const,
        timestamp: item.timestamp || Date.now(),
      }))
      .slice(0, MAX_CACHE);
  });
  const [current, setCurrent] = useState<DesktopFeedNotification | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const latestPollRef = useRef(0);
  const eventDedupRef = useRef<Map<string, number>>(new Map());
  const relationshipThrottleRef = useRef<Map<string, number>>(new Map());
  const councilBriefSeenRef = useRef<Map<string, number>>(new Map());
  const councilBriefPreferenceSyncRef = useRef<{
    desktopEnabled: boolean;
    throttleMs: number;
    syncedAt: number;
  } | null>(null);

  useEffect(() => {
    storage.setDesktopNotifications(
      notifications.map(item => ({
        id: item.id,
        type: item.type,
        title: item.title,
        message: item.message,
        timestamp: item.timestamp,
      }))
    );
  }, [notifications]);

  const pushNotification = useCallback((item: DesktopFeedNotification) => {
    if (storage.getSettings().notifications === false) {
      return;
    }
    setNotifications(prev => [item, ...prev].slice(0, MAX_CACHE));
  }, []);

  const pushEventNotification = useCallback(
    (input: Omit<DesktopFeedNotification, 'id' | 'timestamp' | 'source'>) => {
      const key = `${input.type}|${input.title}|${input.message}`;
      const now = Date.now();
      const lastTs = eventDedupRef.current.get(key) || 0;
      if (now - lastTs < EVENT_DEDUP_WINDOW_MS) {
        return;
      }

      eventDedupRef.current.set(key, now);
      if (eventDedupRef.current.size > 200) {
        for (const [eventKey, timestamp] of eventDedupRef.current.entries()) {
          if (now - timestamp > EVENT_DEDUP_WINDOW_MS * 5) {
            eventDedupRef.current.delete(eventKey);
          }
        }
      }

      pushNotification(toEventNotification(input));
    },
    [pushNotification]
  );

  const addNotification = useCallback(
    (notification: Omit<DesktopFeedNotification, 'id' | 'timestamp' | 'source'>) => {
      pushNotification(toEventNotification(notification));
    },
    [pushNotification]
  );

  const syncCouncilBriefPreferences = useCallback(async () => {
    const config = readCouncilBriefReminderConfig();
    const desktopEnabled = config.notificationsEnabled && config.councilBriefEnabled;
    const now = Date.now();
    const previous = councilBriefPreferenceSyncRef.current;
    if (
      previous &&
      previous.desktopEnabled === desktopEnabled &&
      previous.throttleMs === config.throttleMs &&
      now - previous.syncedAt < COUNCIL_PREF_SYNC_COOLDOWN_MS
    ) {
      return;
    }

    const result = await api.updateCouncilBriefPreferences({
      channels: {
        desktop: desktopEnabled,
      },
      throttleMs: config.throttleMs,
    });

    if (!result) {
      return;
    }

    councilBriefPreferenceSyncRef.current = {
      desktopEnabled,
      throttleMs: config.throttleMs,
      syncedAt: now,
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!frogTokenId) {
      return;
    }

    const settings = storage.getSettings();
    if (settings.notifications !== false) {
      const remote = await api.getNotificationFeed(frogTokenId, { limit: 20 });

      const next = remote
        .map(item =>
          toDesktopNotification({
            type:
              item.type === 'travel'
                ? 'travel'
                : item.type === 'ritual'
                  ? 'ritual'
                  : item.type === 'life'
                    ? 'life'
                    : 'system',
            title: item.title || '通知',
            message: item.message || '',
            source: 'poll',
          })
        )
        .filter(item => item.timestamp > latestPollRef.current);

      if (next.length > 0) {
        latestPollRef.current = Date.now();
        setNotifications(prev => [...next, ...prev].slice(0, MAX_CACHE));
      }
    }

    await syncCouncilBriefPreferences();

    const councilConfig = readCouncilBriefReminderConfig();
    if (!councilConfig.notificationsEnabled || !councilConfig.councilBriefEnabled) {
      return;
    }

    const brief = await api.getCouncilBrief('desktop');
    if (!brief || brief.delivery.status !== 'DELIVERED' || !brief.delivery.shouldNotify) {
      return;
    }

    if (councilBriefSeenRef.current.has(brief.id)) {
      return;
    }

    councilBriefSeenRef.current.set(brief.id, Date.now());
    if (councilBriefSeenRef.current.size > COUNCIL_BRIEF_SEEN_CACHE_MAX) {
      const oldest = Array.from(councilBriefSeenRef.current.entries()).sort((left, right) => left[1] - right[1]);
      while (councilBriefSeenRef.current.size > COUNCIL_BRIEF_SEEN_CACHE_MAX && oldest.length > 0) {
        const candidate = oldest.shift();
        if (candidate) {
          councilBriefSeenRef.current.delete(candidate[0]);
        }
      }
    }

    pushEventNotification({
      type: 'system',
      title: '议会周报',
      message: brief.summary,
    });
  }, [frogTokenId, pushEventNotification, syncCouncilBriefPreferences]);

  const pushRelationshipNotification = useCallback(
    (input: { title: string; message: string; throttleKey: string }) => {
      const config = readRelationshipReminderConfig();
      if (!config.notificationsEnabled || !config.relationshipEnabled) {
        return;
      }

      const now = Date.now();
      const lastTs = relationshipThrottleRef.current.get(input.throttleKey) || 0;
      if (now - lastTs < config.throttleMs) {
        return;
      }

      relationshipThrottleRef.current.set(input.throttleKey, now);
      if (relationshipThrottleRef.current.size > 200) {
        for (const [key, timestamp] of relationshipThrottleRef.current.entries()) {
          if (now - timestamp > config.throttleMs * 2) {
            relationshipThrottleRef.current.delete(key);
          }
        }
      }

      pushEventNotification({
        type: 'system',
        title: input.title,
        message: input.message,
      });
    },
    [pushEventNotification]
  );

  useEffect(() => {
    if (!frogTokenId) return;
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, pollIntervalMs);
    return () => window.clearInterval(timer);
  }, [frogTokenId, pollIntervalMs, refresh]);

  useEffect(() => {
    const onTravelStarted = () => {
      pushEventNotification({
        type: 'travel',
        title: '旅行开始',
        message: '你的青蛙已经启程。',
      });
    };

    const onTravelCompleted = () => {
      pushEventNotification({
        type: 'travel',
        title: '旅行完成',
        message: '旅行已完成，可查看旅途收获。',
      });
    };

    const onStatusChanged = () => {
      pushEventNotification({
        type: 'life',
        title: '生命状态更新',
        message: '青蛙状态已刷新。',
      });
    };

    const onBlessingCompleted = () => {
      pushEventNotification({
        type: 'ritual',
        title: '祈福完成',
        message: '收到了新的祈福反馈。',
      });
    };

    const onDomainEvent = (event: Event) => {
      const custom = event as CustomEvent<unknown>;
      const parsed = parseDomainEvent(custom.detail);
      if (!parsed) return;

      const relationshipMapped = mapRelationshipEventToNotification(parsed.eventName, parsed.payload);
      if (relationshipMapped) {
        pushRelationshipNotification(relationshipMapped);
        return;
      }

      const mapped = mapDomainEventToNotification(parsed.eventName, parsed.payload);
      if (!mapped) return;
      pushEventNotification(mapped);
    };

    const onWsMessage = (event: Event) => {
      const custom = event as CustomEvent<unknown>;
      const parsed = parseDomainEventMessage(custom.detail);
      if (!parsed) return;

      const relationshipMapped = mapRelationshipEventToNotification(parsed.eventName, parsed.payload);
      if (relationshipMapped) {
        pushRelationshipNotification(relationshipMapped);
        return;
      }

      const mapped = mapDomainEventToNotification(parsed.eventName, parsed.payload);
      if (!mapped) return;
      pushEventNotification(mapped);
    };

    window.addEventListener('travel:started', onTravelStarted);
    window.addEventListener('travel:completed', onTravelCompleted);
    window.addEventListener('desktop:frog-status-changed', onStatusChanged);
    window.addEventListener('ritual:blessingCompleted', onBlessingCompleted);
    window.addEventListener(DOMAIN_EVENT_CHANNEL, onDomainEvent as EventListener);
    window.addEventListener(WS_EVENT_MESSAGE_CHANNEL, onWsMessage as EventListener);

    return () => {
      window.removeEventListener('travel:started', onTravelStarted);
      window.removeEventListener('travel:completed', onTravelCompleted);
      window.removeEventListener('desktop:frog-status-changed', onStatusChanged);
      window.removeEventListener('ritual:blessingCompleted', onBlessingCompleted);
      window.removeEventListener(DOMAIN_EVENT_CHANNEL, onDomainEvent as EventListener);
      window.removeEventListener(WS_EVENT_MESSAGE_CHANNEL, onWsMessage as EventListener);
    };
  }, [pushEventNotification, pushRelationshipNotification]);

  useEffect(() => {
    if (current || notifications.length === 0) return;
    setCurrent(notifications[0]);
    setNotifications(prev => prev.slice(1));

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      setCurrent(null);
    }, 3500);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [current, notifications]);

  const dismissCurrent = useCallback(() => {
    setCurrent(null);
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return useMemo(
    () => ({
      notifications,
      current,
      addNotification,
      dismissCurrent,
      refresh,
    }),
    [notifications, current, addNotification, dismissCurrent, refresh]
  );
}

export default useNotificationFeed;
