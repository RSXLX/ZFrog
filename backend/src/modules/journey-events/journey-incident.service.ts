import { randomUUID } from 'crypto';
import { AppError } from '../../middlewares/errorHandler';
import {
  type JourneyReadModel,
  type JourneyStepSettleResult,
  v3JourneyService,
} from '../journey/journey.service';
import {
  buildJourneyIncidentPromptTrace,
  type JourneyIncidentPromptTrace,
} from './prompt-kit';

export const JOURNEY_INCIDENT_TEMPLATES = ['METEOR_RESCUE_NIGHT'] as const;
export const JOURNEY_INCIDENT_STATUSES = ['TRIGGERED', 'RESOLVED', 'FALLBACK_SETTLED'] as const;
export const JOURNEY_INCIDENT_DECISIONS = [
  'DEPLOY_RESCUE',
  'HOLD_FORMATION',
  'ABORT_MISSION',
] as const;
export const JOURNEY_INCIDENT_OUTCOMES = [
  'RESCUED',
  'STABILIZED',
  'MISSION_ABORTED',
  'FALLBACK_REWARD_APPLIED',
] as const;
export const JOURNEY_INCIDENT_MEMORY_IMPORTANCE = ['LOW', 'MEDIUM', 'HIGH'] as const;

export type JourneyIncidentTemplate = (typeof JOURNEY_INCIDENT_TEMPLATES)[number];
export type JourneyIncidentStatus = (typeof JOURNEY_INCIDENT_STATUSES)[number];
export type JourneyIncidentDecision = (typeof JOURNEY_INCIDENT_DECISIONS)[number];
export type JourneyIncidentOutcome = (typeof JOURNEY_INCIDENT_OUTCOMES)[number];
export type JourneyIncidentMemoryImportance = (typeof JOURNEY_INCIDENT_MEMORY_IMPORTANCE)[number];

export interface JourneyIncidentRelationshipSignal {
  sourceWallet: string;
  targetWallet: string;
  trustDelta: number;
  reason: string;
}

export interface JourneyIncidentMemoryFragment {
  id: string;
  title: string;
  text: string;
  importance: JourneyIncidentMemoryImportance;
  tags: string[];
}

export interface JourneyIncidentReadModel {
  id: string;
  journeyId: string;
  stepId: string;
  template: JourneyIncidentTemplate;
  title: string;
  description: string;
  status: JourneyIncidentStatus;
  options: JourneyIncidentDecision[];
  promptTrace: JourneyIncidentPromptTrace;
  triggeredAt: string;
  resolvedAt: string | null;
  resolution: {
    decision: JourneyIncidentDecision | null;
    outcome: JourneyIncidentOutcome | null;
    note: string | null;
    respondedByActor: string | null;
  };
  effects: {
    relationshipSignals: JourneyIncidentRelationshipSignal[];
    memoryFragments: JourneyIncidentMemoryFragment[];
  };
  audit: {
    createdByAppId: string;
    createdByKeyId: string;
    createdByActor: string;
    requestId: string | null;
    updatedByActor: string;
  };
}

export interface TriggerJourneyIncidentCommand {
  journeyId: string;
  stepId?: string;
  template?: JourneyIncidentTemplate;
  contextNote?: string;
  requestedBy: {
    appId: string;
    keyId: string;
    actor: string;
    requestId?: string | null;
  };
}

export interface RespondJourneyIncidentCommand {
  incidentId: string;
  decision: JourneyIncidentDecision;
  note?: string;
  requestedBy: {
    appId: string;
    actor: string;
  };
}

export interface JourneyIncidentResult {
  incident: JourneyIncidentReadModel;
  journey: JourneyReadModel;
}

interface JourneyIncidentState extends JourneyIncidentReadModel {}

const INCIDENT_ID_PATTERN = /^evt_[a-z0-9]+$/;
const INCIDENT_TEMPLATE_SET = new Set<string>(JOURNEY_INCIDENT_TEMPLATES);
const INCIDENT_DECISION_SET = new Set<string>(JOURNEY_INCIDENT_DECISIONS);

const parseBoolean = (raw: string | undefined, fallback: boolean): boolean => {
  if (raw === undefined) {
    return fallback;
  }
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
};

const isJourneyIncidentEngineEnabled = (): boolean =>
  parseBoolean(process.env.V3_JOURNEY_INCIDENTS_ENABLED, true);

const toIncidentId = (): string => `evt_${randomUUID().replace(/-/g, '').slice(0, 24)}`;

const cloneIncident = (incident: JourneyIncidentState): JourneyIncidentReadModel => ({
  ...incident,
  options: [...incident.options],
  promptTrace: {
    ...incident.promptTrace,
    variables: { ...incident.promptTrace.variables },
  },
  resolution: { ...incident.resolution },
  effects: {
    relationshipSignals: incident.effects.relationshipSignals.map((signal) => ({ ...signal })),
    memoryFragments: incident.effects.memoryFragments.map((fragment) => ({
      ...fragment,
      tags: [...fragment.tags],
    })),
  },
  audit: {
    ...incident.audit,
  },
});

const createIncidentNarrative = (input: {
  template: JourneyIncidentTemplate;
  journey: JourneyReadModel;
  stepId: string;
}): { title: string; description: string } => {
  if (input.template === 'METEOR_RESCUE_NIGHT') {
    const step = input.journey.steps.find((item) => item.id === input.stepId);
    return {
      title: 'Meteor Rescue Night',
      description: `A meteor shower threatens ${step?.title || 'the current chapter'}. Decide whether the party launches a coordinated rescue or retreats.`,
    };
  }

  return {
    title: 'Journey Incident',
    description: 'An incident requires team coordination.',
  };
};

const getIncidentOptions = (template: JourneyIncidentTemplate): JourneyIncidentDecision[] => {
  if (template === 'METEOR_RESCUE_NIGHT') {
    return ['DEPLOY_RESCUE', 'HOLD_FORMATION', 'ABORT_MISSION'];
  }
  return ['HOLD_FORMATION'];
};

const resolveDecision = (
  decision: JourneyIncidentDecision
): {
  settleResult: JourneyStepSettleResult;
  outcome: JourneyIncidentOutcome;
  trustDelta: number;
  importance: JourneyIncidentMemoryImportance;
  defaultNote: string;
} => {
  if (decision === 'DEPLOY_RESCUE') {
    return {
      settleResult: 'COMPLETED',
      outcome: 'RESCUED',
      trustDelta: 2,
      importance: 'HIGH',
      defaultNote: 'Rescue team deployed and the chapter objective was secured.',
    };
  }

  if (decision === 'ABORT_MISSION') {
    return {
      settleResult: 'FAILED',
      outcome: 'MISSION_ABORTED',
      trustDelta: -1,
      importance: 'HIGH',
      defaultNote: 'Mission aborted to preserve team safety.',
    };
  }

  return {
    settleResult: 'COMPLETED',
    outcome: 'STABILIZED',
    trustDelta: 1,
    importance: 'MEDIUM',
    defaultNote: 'Party held formation and stabilized the incident.',
  };
};

const buildIncidentEffects = (input: {
  incidentId: string;
  journey: JourneyReadModel;
  stepId: string;
  decision: JourneyIncidentDecision | null;
  outcome: JourneyIncidentOutcome;
  trustDelta: number;
  note: string;
  importance: JourneyIncidentMemoryImportance;
  fallback: boolean;
}): JourneyIncidentReadModel['effects'] => {
  const relationshipSignals: JourneyIncidentRelationshipSignal[] = [];
  const members = input.journey.partyMembers.map((member) => member.walletAddress);

  if (!input.fallback) {
    for (let i = 0; i < members.length; i += 1) {
      for (let j = i + 1; j < members.length; j += 1) {
        const source = members[i];
        const target = members[j];
        if (!source || !target) {
          continue;
        }
        relationshipSignals.push({
          sourceWallet: source,
          targetWallet: target,
          trustDelta: input.trustDelta,
          reason: `incident:${input.outcome.toLowerCase()}`,
        });
        relationshipSignals.push({
          sourceWallet: target,
          targetWallet: source,
          trustDelta: input.trustDelta,
          reason: `incident:${input.outcome.toLowerCase()}`,
        });
      }
    }
  }

  const step = input.journey.steps.find((item) => item.id === input.stepId);
  const memoryText = input.fallback
    ? `Incident engine disabled. Fallback reward settled chapter "${step?.title || input.stepId}".`
    : `Incident resolved via ${input.decision}. Outcome: ${input.outcome}. ${input.note}`;

  const memoryFragments: JourneyIncidentMemoryFragment[] = [
    {
      id: `mem_${input.incidentId}`,
      title: 'Journey Incident Memory',
      text: memoryText,
      importance: input.importance,
      tags: ['journey', 'incident', input.outcome.toLowerCase()],
    },
  ];

  return {
    relationshipSignals,
    memoryFragments,
  };
};

class JourneyIncidentService {
  private readonly incidents = new Map<string, JourneyIncidentState>();
  private readonly incidentIdsByJourney = new Map<string, string[]>();

  triggerIncident(input: TriggerJourneyIncidentCommand): JourneyIncidentResult {
    const journey = v3JourneyService.getJourneyById(input.journeyId, {
      scopeAppId: input.requestedBy.appId,
    });
    if (journey.status !== 'ACTIVE' || !journey.currentStepId) {
      throw new AppError(409, 'journey is not active for incident trigger', 'INVALID_STATE', {
        journeyId: journey.id,
        status: journey.status,
        currentStepId: journey.currentStepId,
      });
    }

    const targetStepId = input.stepId?.trim().toLowerCase() || journey.currentStepId;
    if (targetStepId !== journey.currentStepId) {
      throw new AppError(409, 'incident can only be triggered on current active step', 'INVALID_STATE', {
        journeyId: journey.id,
        stepId: targetStepId,
        currentStepId: journey.currentStepId,
      });
    }

    const step = journey.steps.find((item) => item.id === targetStepId);
    if (!step) {
      throw new AppError(404, 'journey step not found', 'NOT_FOUND', {
        journeyId: journey.id,
        stepId: targetStepId,
      });
    }
    if (step.status !== 'ACTIVE') {
      throw new AppError(409, 'journey step is not active', 'INVALID_STATE', {
        journeyId: journey.id,
        stepId: targetStepId,
        stepStatus: step.status,
      });
    }

    const template = (input.template || 'METEOR_RESCUE_NIGHT').trim().toUpperCase();
    if (!INCIDENT_TEMPLATE_SET.has(template)) {
      throw new AppError(400, 'incident template is invalid', 'INVALID_INPUT', {
        template,
      });
    }

    const unresolved = this.listIncidentsForJourney(journey.id).find(
      (incident) =>
        incident.audit.createdByAppId === input.requestedBy.appId &&
        incident.stepId === targetStepId &&
        incident.status === 'TRIGGERED'
    );
    if (unresolved) {
      throw new AppError(409, 'incident already pending for this step', 'INVALID_STATE', {
        journeyId: journey.id,
        stepId: targetStepId,
        incidentId: unresolved.id,
      });
    }

    const now = new Date().toISOString();
    const incidentId = toIncidentId();
    const narrative = createIncidentNarrative({
      template: template as JourneyIncidentTemplate,
      journey,
      stepId: targetStepId,
    });
    const promptTrace = buildJourneyIncidentPromptTrace({
      journey,
      stepId: targetStepId,
      template,
      ...(input.contextNote?.trim() ? { contextNote: input.contextNote.trim() } : {}),
    });

    if (!isJourneyIncidentEngineEnabled()) {
      const fallbackReason = 'incident engine disabled; fallback step reward applied';
      const settledJourney = v3JourneyService.advanceJourneyStep({
        journeyId: journey.id,
        stepId: targetStepId,
        reason: fallbackReason,
        requestedBy: {
          appId: input.requestedBy.appId,
          actor: input.requestedBy.actor,
        },
      });

      const effects = buildIncidentEffects({
        incidentId,
        journey: settledJourney,
        stepId: targetStepId,
        decision: null,
        outcome: 'FALLBACK_REWARD_APPLIED',
        trustDelta: 0,
        note: fallbackReason,
        importance: 'LOW',
        fallback: true,
      });

      const fallbackIncident: JourneyIncidentState = {
        id: incidentId,
        journeyId: journey.id,
        stepId: targetStepId,
        template: template as JourneyIncidentTemplate,
        title: narrative.title,
        description: narrative.description,
        status: 'FALLBACK_SETTLED',
        options: getIncidentOptions(template as JourneyIncidentTemplate),
        promptTrace,
        triggeredAt: now,
        resolvedAt: now,
        resolution: {
          decision: null,
          outcome: 'FALLBACK_REWARD_APPLIED',
          note: fallbackReason,
          respondedByActor: input.requestedBy.actor,
        },
        effects,
        audit: {
          createdByAppId: input.requestedBy.appId,
          createdByKeyId: input.requestedBy.keyId,
          createdByActor: input.requestedBy.actor,
          requestId: input.requestedBy.requestId?.trim() || null,
          updatedByActor: input.requestedBy.actor,
        },
      };

      this.storeIncident(fallbackIncident);
      return {
        incident: cloneIncident(fallbackIncident),
        journey: settledJourney,
      };
    }

    const incident: JourneyIncidentState = {
      id: incidentId,
      journeyId: journey.id,
      stepId: targetStepId,
      template: template as JourneyIncidentTemplate,
      title: narrative.title,
      description: narrative.description,
      status: 'TRIGGERED',
      options: getIncidentOptions(template as JourneyIncidentTemplate),
      promptTrace,
      triggeredAt: now,
      resolvedAt: null,
      resolution: {
        decision: null,
        outcome: null,
        note: null,
        respondedByActor: null,
      },
      effects: {
        relationshipSignals: [],
        memoryFragments: [],
      },
      audit: {
        createdByAppId: input.requestedBy.appId,
        createdByKeyId: input.requestedBy.keyId,
        createdByActor: input.requestedBy.actor,
        requestId: input.requestedBy.requestId?.trim() || null,
        updatedByActor: input.requestedBy.actor,
      },
    };

    this.storeIncident(incident);
    return {
      incident: cloneIncident(incident),
      journey,
    };
  }

  respondIncident(input: RespondJourneyIncidentCommand): JourneyIncidentResult {
    const incident = this.getIncidentByIdOrThrow(input.incidentId, input.requestedBy.appId);
    if (incident.status !== 'TRIGGERED') {
      throw new AppError(409, 'incident is not open for response', 'INVALID_STATE', {
        incidentId: input.incidentId,
        status: incident.status,
      });
    }

    const normalizedDecision = input.decision.trim().toUpperCase();
    if (!INCIDENT_DECISION_SET.has(normalizedDecision)) {
      throw new AppError(400, 'incident decision is invalid', 'INVALID_INPUT', {
        decision: input.decision,
      });
    }
    if (!incident.options.includes(normalizedDecision as JourneyIncidentDecision)) {
      throw new AppError(400, 'incident decision is not supported by this incident', 'INVALID_INPUT', {
        incidentId: incident.id,
        decision: normalizedDecision,
        supported: incident.options,
      });
    }

    const journey = v3JourneyService.getJourneyById(incident.journeyId, {
      scopeAppId: input.requestedBy.appId,
    });
    if (journey.status !== 'ACTIVE' || journey.currentStepId !== incident.stepId) {
      throw new AppError(409, 'journey step cannot accept incident response', 'INVALID_STATE', {
        journeyId: journey.id,
        currentStepId: journey.currentStepId,
        incidentStepId: incident.stepId,
        journeyStatus: journey.status,
      });
    }

    const decisionResolution = resolveDecision(normalizedDecision as JourneyIncidentDecision);
    const resolvedNote = input.note?.trim() || decisionResolution.defaultNote;
    const settledJourney = v3JourneyService.settleJourneyStep({
      journeyId: journey.id,
      stepId: incident.stepId,
      result: decisionResolution.settleResult,
      reason: resolvedNote,
      requestedBy: {
        appId: input.requestedBy.appId,
        actor: input.requestedBy.actor,
      },
    });
    const resolvedAt = new Date().toISOString();

    incident.status = 'RESOLVED';
    incident.resolvedAt = resolvedAt;
    incident.resolution = {
      decision: normalizedDecision as JourneyIncidentDecision,
      outcome: decisionResolution.outcome,
      note: resolvedNote,
      respondedByActor: input.requestedBy.actor,
    };
    incident.effects = buildIncidentEffects({
      incidentId: incident.id,
      journey: settledJourney,
      stepId: incident.stepId,
      decision: normalizedDecision as JourneyIncidentDecision,
      outcome: decisionResolution.outcome,
      trustDelta: decisionResolution.trustDelta,
      note: resolvedNote,
      importance: decisionResolution.importance,
      fallback: false,
    });
    incident.audit.updatedByActor = input.requestedBy.actor;

    return {
      incident: cloneIncident(incident),
      journey: settledJourney,
    };
  }

  listJourneyIncidents(input: {
    journeyId: string;
    scopeAppId?: string;
  }): JourneyIncidentReadModel[] {
    const journey = v3JourneyService.getJourneyById(input.journeyId, {
      scopeAppId: input.scopeAppId,
    });
    return this.listIncidentsForJourney(journey.id)
      .filter((incident) => !input.scopeAppId || incident.audit.createdByAppId === input.scopeAppId)
      .sort((left, right) => right.triggeredAt.localeCompare(left.triggeredAt))
      .map(cloneIncident);
  }

  resetForTest(): void {
    this.incidents.clear();
    this.incidentIdsByJourney.clear();
  }

  private getIncidentByIdOrThrow(incidentId: string, scopeAppId?: string): JourneyIncidentState {
    const normalized = incidentId.trim().toLowerCase();
    if (!INCIDENT_ID_PATTERN.test(normalized)) {
      throw new AppError(400, 'incidentId is invalid', 'INVALID_INPUT', {
        incidentId,
      });
    }

    const incident = this.incidents.get(normalized);
    if (!incident || (scopeAppId && incident.audit.createdByAppId !== scopeAppId)) {
      throw new AppError(404, 'incident not found', 'NOT_FOUND', {
        incidentId: normalized,
      });
    }
    return incident;
  }

  private storeIncident(incident: JourneyIncidentState): void {
    this.incidents.set(incident.id, incident);
    const current = this.incidentIdsByJourney.get(incident.journeyId) || [];
    current.push(incident.id);
    this.incidentIdsByJourney.set(incident.journeyId, current);
  }

  private listIncidentsForJourney(journeyId: string): JourneyIncidentState[] {
    const ids = this.incidentIdsByJourney.get(journeyId) || [];
    return ids
      .map((id) => this.incidents.get(id))
      .filter((item): item is JourneyIncidentState => Boolean(item));
  }
}

export const v3JourneyIncidentService = new JourneyIncidentService();
export const resetV3JourneyIncidentStoreForTest = (): void => {
  v3JourneyIncidentService.resetForTest();
};
