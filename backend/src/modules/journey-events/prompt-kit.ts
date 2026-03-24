import { createHash, randomUUID } from 'crypto';
import type { JourneyReadModel } from '../journey/journey.service';

export const JOURNEY_INCIDENT_PROMPT_KIT_VERSION = '2026-03-23.journey-incidents.prompt-kit.v1' as const;
export const JOURNEY_INCIDENT_SYSTEM_PROMPT_VERSION =
  '2026-03-23.journey-incidents.system.v1' as const;
export const JOURNEY_INCIDENT_RESPONSE_PROMPT_VERSION =
  '2026-03-23.journey-incidents.response.v1' as const;

export interface JourneyIncidentPromptTrace {
  traceId: string;
  promptKitVersion: string;
  systemPromptVersion: string;
  responsePromptVersion: string;
  fingerprint: string;
  variables: Record<string, unknown>;
}

const digest = (value: string): string =>
  createHash('sha256').update(value).digest('hex').slice(0, 24);

const trimPreview = (value: string, max = 180): string => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '';
  }
  if (normalized.length <= max) {
    return normalized;
  }
  return `${normalized.slice(0, max - 1)}…`;
};

export const buildJourneyIncidentPromptTrace = (input: {
  journey: JourneyReadModel;
  stepId: string;
  template: string;
  contextNote?: string;
}): JourneyIncidentPromptTrace => {
  const step = input.journey.steps.find((item) => item.id === input.stepId);
  const preview = trimPreview(input.contextNote || input.journey.narrativeSeed || '');

  const fingerprintSeed = [
    input.journey.id,
    input.journey.slug,
    input.stepId,
    step?.riskLevel || 'UNKNOWN',
    input.template,
    preview,
  ].join('|');

  return {
    traceId: `trace_${randomUUID().replace(/-/g, '').slice(0, 24)}`,
    promptKitVersion: JOURNEY_INCIDENT_PROMPT_KIT_VERSION,
    systemPromptVersion: JOURNEY_INCIDENT_SYSTEM_PROMPT_VERSION,
    responsePromptVersion: JOURNEY_INCIDENT_RESPONSE_PROMPT_VERSION,
    fingerprint: digest(fingerprintSeed),
    variables: {
      journeyId: input.journey.id,
      journeySlug: input.journey.slug,
      journeyTitle: input.journey.title,
      stepId: input.stepId,
      stepTitle: step?.title || null,
      riskLevel: step?.riskLevel || null,
      template: input.template,
      contextPreview: preview || null,
      partySize: input.journey.partyMembers.length,
    },
  };
};
