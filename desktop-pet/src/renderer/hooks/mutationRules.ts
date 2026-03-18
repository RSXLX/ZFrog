import { PetGenotype } from './genetics';

export type MutationRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface MutationContext {
  careQuality: number;
  environment: 'indoor' | 'pond' | 'forest' | 'desert' | 'snow';
  generation: number;
}

export interface MutationResult {
  mutated: boolean;
  rarity?: MutationRarity;
  trait?: string;
  genotype: PetGenotype;
}

export const ENVIRONMENT_TRAITS: Record<MutationContext['environment'], string[]> = {
  indoor: ['gentleGlow'],
  pond: ['aquaSkin', 'rippleBack'],
  forest: ['mossPattern', 'leafSpots'],
  desert: ['sandStripe', 'sunCrest'],
  snow: ['frostMark', 'iceBloom'],
};

export function isMutationTrait(trait: string): boolean {
  return Object.values(ENVIRONMENT_TRAITS).some((traits) => traits.includes(trait));
}

export function applyRareMutation(genotype: PetGenotype, context: MutationContext): MutationResult {
  let chance = 0.03;
  if (context.careQuality > 80) chance += 0.02;
  if (context.environment === 'desert' || context.environment === 'snow') chance += 0.02;
  if (context.generation >= 3) chance += 0.01;

  if (Math.random() > chance) {
    return { mutated: false, genotype };
  }

  const pool = ENVIRONMENT_TRAITS[context.environment];
  const trait = pool[Math.floor(Math.random() * pool.length)];
  const rarity: MutationRarity = context.careQuality > 90 ? 'epic' : 'rare';

  return {
    mutated: true,
    rarity,
    trait,
    genotype: {
      ...genotype,
      specialTraits: [...new Set([...genotype.specialTraits, trait])].slice(0, 5),
    },
  };
}
