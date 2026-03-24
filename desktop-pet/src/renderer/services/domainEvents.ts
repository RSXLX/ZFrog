import { domainEventSchema, type DomainEvent } from '../../../../packages/shared/src';

export const DOMAIN_EVENT_CHANNEL = 'desktop:domain-event';
export const WS_EVENT_MESSAGE_CHANNEL = 'desktop:ws-message';

interface EmitDomainEventInput<TPayload = unknown> {
  eventName: string;
  payload: TPayload;
  source?: string;
  eventVersion?: number;
  requestId?: string;
  correlationId?: string;
  occurredAt?: string;
}

type UnknownRecord = Record<string, unknown>;

const parseJson = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const getRecordField = (value: unknown, field: string): unknown => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  return (value as UnknownRecord)[field];
};

const extractCandidates = (input: unknown): unknown[] => {
  const queue: unknown[] = [input];
  const candidates: unknown[] = [];
  const seen = new Set<unknown>();

  while (queue.length > 0) {
    const next = queue.shift();
    if (next === undefined || next === null) {
      continue;
    }

    if (typeof next === 'string') {
      const parsed = parseJson(next);
      if (parsed !== null) {
        queue.push(parsed);
      }
      continue;
    }

    if (seen.has(next)) {
      continue;
    }
    seen.add(next);
    candidates.push(next);

    queue.push(getRecordField(next, 'detail'));
    queue.push(getRecordField(next, 'data'));
    queue.push(getRecordField(next, 'event'));
  }

  return candidates;
};

export const parseDomainEvent = (input: unknown): DomainEvent<unknown> | null => {
  const candidates = extractCandidates(input);

  for (const candidate of candidates) {
    const parsed = domainEventSchema.safeParse(candidate);
    if (parsed.success) {
      return parsed.data as DomainEvent<unknown>;
    }
  }

  return null;
};

export const parseDomainEventMessage = (message: unknown): DomainEvent<unknown> | null => {
  return parseDomainEvent(message);
};

export const emitDomainEvent = <TPayload = unknown>(
  input: EmitDomainEventInput<TPayload>
): DomainEvent<TPayload> => {
  const event: DomainEvent<TPayload> = {
    eventName: input.eventName,
    eventVersion: input.eventVersion ?? 1,
    source: input.source || 'desktop-pet',
    requestId: input.requestId,
    correlationId: input.correlationId,
    occurredAt: input.occurredAt || new Date().toISOString(),
    payload: input.payload,
  };

  window.dispatchEvent(
    new CustomEvent<DomainEvent<TPayload>>(DOMAIN_EVENT_CHANNEL, {
      detail: event,
    })
  );

  return event;
};
