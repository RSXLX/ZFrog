export type DiseaseType = 'cold' | 'indigestion' | 'loneliness' | 'none';

export interface DiseaseState {
  currentDisease: DiseaseType;
  sickDuration: number;
  isSick: boolean;
}

export const DISEASE_PROBABILITIES = {
  cold: 0.05,
  indigestion: 0.1,
  loneliness: 0.08,
};

export function checkDiseaseTrigger(
  cleanliness: number,
  hunger: number,
  happiness: number
): DiseaseType {
  const rand = Math.random();
  if (cleanliness < 30 && rand < DISEASE_PROBABILITIES.cold) return 'cold';
  if (hunger > 90 && rand < DISEASE_PROBABILITIES.indigestion) return 'indigestion';
  if (happiness < 20 && rand < DISEASE_PROBABILITIES.loneliness) return 'loneliness';
  return 'none';
}

export function treatDisease(disease: DiseaseType): boolean {
  // Logic for treating disease could be specific to each disease
  return disease !== 'none';
}
