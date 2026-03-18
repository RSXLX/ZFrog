import { describe, it, expect, vi, afterEach } from 'vitest';
import { applyRareMutation, type MutationContext } from '../renderer/hooks/mutationRules';
import type { PetGenotype } from '../renderer/hooks/genetics';

afterEach(() => vi.restoreAllMocks());

describe('Mutation Rules', () => {
  const genotype: PetGenotype = {
    color: { dominant: 'Green', recessive: 'green' },
    pattern: { dominant: 'Striped', recessive: 'striped' },
    size: { dominant: 'large', recessive: 'small' },
    temperament: { dominant: 'active', recessive: 'calm' },
    specialTraits: ['jumper'],
  };

  const context: MutationContext = {
    careQuality: 95,
    environment: 'snow',
    generation: 4,
  };

  it('should keep genotype unchanged when mutation does not trigger', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const result = applyRareMutation(genotype, context);
    expect(result.mutated).toBe(false);
    expect(result.genotype.specialTraits).toEqual(['jumper']);
  });

  it('should append environment-based rare trait when mutation triggers', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0);
    const result = applyRareMutation(genotype, context);
    expect(result.mutated).toBe(true);
    expect(result.rarity).toBe('epic');
    expect(result.genotype.specialTraits.length).toBeGreaterThan(1);
  });
});
