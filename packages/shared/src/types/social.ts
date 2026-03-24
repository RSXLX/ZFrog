export type RelationshipAttestationType =
  | 'blessing'
  | 'rescue'
  | 'friendship'
  | 'memory'
  | (string & {});

export interface FamilyReadModel {
  id: number;
  name: string;
  ownerFrogId: number;
  createdAt: string;
}

export interface CommunityReadModel {
  id: number;
  name: string;
  createdAt: string;
}

export interface RelationshipAttestationCreatePayload {
  subjectFrogId: number;
  objectFrogId: number;
  attestationType: RelationshipAttestationType;
  source: string;
  evidence?: Record<string, unknown>;
}
