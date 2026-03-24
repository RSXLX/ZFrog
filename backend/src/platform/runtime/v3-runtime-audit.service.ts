import { Prisma } from '@prisma/client';
import { prisma } from '../../database';
import { V3_RUNTIME_MODULES, V3RuntimeModule } from './v3-runtime.service';

export const V3_RUNTIME_AUDIT_ACTIONS = [
  'kill_switch_enabled',
  'kill_switch_disabled',
  'module_enabled',
  'module_disabled',
] as const;

export type V3RuntimeAuditAction = (typeof V3_RUNTIME_AUDIT_ACTIONS)[number];

export interface RecordV3RuntimeAuditEventInput {
  action: V3RuntimeAuditAction;
  module?: V3RuntimeModule | null;
  actor?: string | null;
  reason?: string | null;
  requestId?: string | null;
  source?: string;
  details?: Prisma.InputJsonValue | null;
}

export interface ListV3RuntimeAuditEventsInput {
  limit?: number;
  module?: V3RuntimeModule;
}

export interface V3RuntimeAuditEvent {
  id: string;
  action: V3RuntimeAuditAction;
  module: V3RuntimeModule | null;
  actor: string | null;
  reason: string | null;
  requestId: string | null;
  source: string | null;
  occurredAt: string;
  details: Record<string, unknown> | null;
}

const V3_RUNTIME_AUDIT_AGGREGATE_TYPE = 'V3Runtime';
const RUNTIME_EVENT_TYPE_MAP: Record<V3RuntimeAuditAction, string> = {
  kill_switch_enabled: 'V3RuntimeKillSwitchEnabled',
  kill_switch_disabled: 'V3RuntimeKillSwitchDisabled',
  module_enabled: 'V3RuntimeModuleEnabled',
  module_disabled: 'V3RuntimeModuleDisabled',
};

const RUNTIME_AUDIT_ACTION_SET = new Set<string>(V3_RUNTIME_AUDIT_ACTIONS);
const RUNTIME_MODULE_SET = new Set<string>(V3_RUNTIME_MODULES);

const toBoundedLimit = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 20;
  }
  return Math.min(parsed, 100);
};

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const parseAuditAction = (value: unknown, fallbackEventType?: string): V3RuntimeAuditAction => {
  if (typeof value === 'string' && RUNTIME_AUDIT_ACTION_SET.has(value)) {
    return value as V3RuntimeAuditAction;
  }

  if (fallbackEventType === 'V3RuntimeKillSwitchEnabled') {
    return 'kill_switch_enabled';
  }
  if (fallbackEventType === 'V3RuntimeKillSwitchDisabled') {
    return 'kill_switch_disabled';
  }
  if (fallbackEventType === 'V3RuntimeModuleEnabled') {
    return 'module_enabled';
  }
  return 'module_disabled';
};

const parseRuntimeModule = (value: unknown): V3RuntimeModule | null => {
  if (typeof value !== 'string' || !RUNTIME_MODULE_SET.has(value)) {
    return null;
  }
  return value as V3RuntimeModule;
};

export const recordV3RuntimeAuditEvent = async (
  input: RecordV3RuntimeAuditEventInput
): Promise<void> => {
  const moduleValue = input.module || null;
  const eventType = RUNTIME_EVENT_TYPE_MAP[input.action];

  await prisma.domainEvent.create({
    data: {
      aggregateType: V3_RUNTIME_AUDIT_AGGREGATE_TYPE,
      aggregateId: moduleValue ? `module:${moduleValue}` : 'global',
      eventType,
      payload: {
        action: input.action,
        module: moduleValue,
        actor: input.actor?.trim().toLowerCase() || null,
        reason: input.reason?.trim() || null,
        details: input.details || null,
      },
      requestId: input.requestId || null,
      source: input.source || 'admin.v3.runtime',
    },
  });
};

export const listV3RuntimeAuditEvents = async (
  input: ListV3RuntimeAuditEventsInput = {}
): Promise<V3RuntimeAuditEvent[]> => {
  const events = await prisma.domainEvent.findMany({
    where: {
      aggregateType: V3_RUNTIME_AUDIT_AGGREGATE_TYPE,
      ...(input.module ? { aggregateId: `module:${input.module}` } : {}),
    },
    orderBy: [
      { occurredAt: 'desc' },
      { id: 'desc' },
    ],
    take: toBoundedLimit(input.limit),
  });

  return events.map((event) => {
    const payload = toRecord(event.payload);
    const details = toRecord(payload?.details);

    return {
      id: event.id.toString(),
      action: parseAuditAction(payload?.action, event.eventType),
      module: parseRuntimeModule(payload?.module),
      actor: typeof payload?.actor === 'string' ? payload.actor : null,
      reason: typeof payload?.reason === 'string' ? payload.reason : null,
      requestId: event.requestId || null,
      source: event.source || null,
      occurredAt: event.occurredAt.toISOString(),
      details,
    };
  });
};
