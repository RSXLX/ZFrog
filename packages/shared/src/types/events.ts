export type DomainEventName =
  | 'EggClaimed'
  | 'SoulImprinted'
  | 'Hatched'
  | 'PetStateUpdated'
  | 'PetNeedsCare'
  | 'TravelStarted'
  | 'TravelCompleted'
  | 'MemoryPalaceCreated'
  | 'BlessingStarted'
  | 'BlessingCompleted'
  | 'FamilyCreated'
  | 'FamilyMemberJoined'
  | 'FamilyGoalUpdated'
  | 'CommunityJoined'
  | 'RelationshipAttested'
  | 'RelationshipMemoryUpdated'
  | 'FrogWalletAssetChanged'
  | (string & {});

export interface DomainEvent<TPayload = unknown> {
  id?: string;
  eventName: DomainEventName;
  eventVersion: number;
  source: string;
  requestId?: string;
  correlationId?: string;
  occurredAt: string;
  payload: TPayload;
}

export const isDomainEvent = (value: unknown): value is DomainEvent<unknown> => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<DomainEvent<unknown>>;

  return (
    typeof candidate.eventName === 'string' &&
    typeof candidate.eventVersion === 'number' &&
    typeof candidate.source === 'string' &&
    typeof candidate.occurredAt === 'string' &&
    'payload' in candidate
  );
};
