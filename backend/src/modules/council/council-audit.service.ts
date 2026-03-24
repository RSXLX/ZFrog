import { Prisma } from '@prisma/client';
import { prisma } from '../../database';
import {
  COUNCIL_POLICY_RISK_LEVELS,
  CouncilPolicyRiskLevel,
  isCouncilPolicyRiskLevel,
} from './council-policy.service';

export const COUNCIL_POLICY_AUDIT_ACTIONS = [
  'risk_level_enabled',
  'risk_level_disabled',
] as const;

export type CouncilPolicyAuditAction = (typeof COUNCIL_POLICY_AUDIT_ACTIONS)[number];

export interface RecordCouncilPolicyAuditInput {
  action: CouncilPolicyAuditAction;
  riskLevel: CouncilPolicyRiskLevel;
  actor?: string | null;
  reason?: string | null;
  requestId?: string | null;
  source?: string;
  details?: Prisma.InputJsonValue | null;
}

export interface ListCouncilPolicyAuditInput {
  limit?: number;
  riskLevel?: CouncilPolicyRiskLevel;
}

export interface CouncilPolicyAuditEvent {
  id: string;
  action: CouncilPolicyAuditAction;
  riskLevel: CouncilPolicyRiskLevel;
  actor: string | null;
  reason: string | null;
  requestId: string | null;
  source: string | null;
  occurredAt: string;
  details: Record<string, unknown> | null;
}

const COUNCIL_POLICY_AUDIT_AGGREGATE_TYPE = 'CouncilPolicy';

const EVENT_TYPE_MAP: Record<CouncilPolicyAuditAction, string> = {
  risk_level_enabled: 'CouncilRiskLevelEnabled',
  risk_level_disabled: 'CouncilRiskLevelDisabled',
};

const AUDIT_ACTION_SET = new Set<string>(COUNCIL_POLICY_AUDIT_ACTIONS);

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

const parseAction = (value: unknown, fallbackEventType?: string): CouncilPolicyAuditAction => {
  if (typeof value === 'string' && AUDIT_ACTION_SET.has(value)) {
    return value as CouncilPolicyAuditAction;
  }
  return fallbackEventType === 'CouncilRiskLevelEnabled'
    ? 'risk_level_enabled'
    : 'risk_level_disabled';
};

const parseRiskLevel = (value: unknown): CouncilPolicyRiskLevel => {
  if (typeof value === 'string' && isCouncilPolicyRiskLevel(value)) {
    return value;
  }
  return 'MEDIUM';
};

export const recordCouncilPolicyAuditEvent = async (
  input: RecordCouncilPolicyAuditInput
): Promise<void> => {
  await prisma.domainEvent.create({
    data: {
      aggregateType: COUNCIL_POLICY_AUDIT_AGGREGATE_TYPE,
      aggregateId: `risk:${input.riskLevel}`,
      eventType: EVENT_TYPE_MAP[input.action],
      payload: {
        action: input.action,
        riskLevel: input.riskLevel,
        actor: input.actor?.trim().toLowerCase() || null,
        reason: input.reason?.trim() || null,
        details: input.details || null,
      },
      requestId: input.requestId || null,
      source: input.source || 'admin.v3.council',
    },
  });
};

export const listCouncilPolicyAuditEvents = async (
  input: ListCouncilPolicyAuditInput = {}
): Promise<CouncilPolicyAuditEvent[]> => {
  const events = await prisma.domainEvent.findMany({
    where: {
      aggregateType: COUNCIL_POLICY_AUDIT_AGGREGATE_TYPE,
      ...(input.riskLevel ? { aggregateId: `risk:${input.riskLevel}` } : {}),
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
      action: parseAction(payload?.action, event.eventType),
      riskLevel: parseRiskLevel(payload?.riskLevel),
      actor: typeof payload?.actor === 'string' ? payload.actor : null,
      reason: typeof payload?.reason === 'string' ? payload.reason : null,
      requestId: event.requestId || null,
      source: event.source || null,
      occurredAt: event.occurredAt.toISOString(),
      details,
    };
  });
};

export const isCouncilPolicyAuditRiskLevel = (value: string): value is CouncilPolicyRiskLevel =>
  COUNCIL_POLICY_RISK_LEVELS.includes(value as CouncilPolicyRiskLevel);
