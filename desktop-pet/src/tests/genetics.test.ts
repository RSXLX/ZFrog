import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  derivePhenotype,
  calculatePunnettOffspring,
  toLegacyGene,
  type PetGenotype,
} from '../renderer/hooks/genetics';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Genetics 2.0 Rules', () => {
  const parentA: PetGenotype = {
    color: { dominant: 'Green', recessive: 'green' },
    pattern: { dominant: 'Striped', recessive: 'striped' },
    size: { dominant: 'large', recessive: 'small' },
    temperament: { dominant: 'active', recessive: 'calm' },
    specialTraits: ['jumper', 'singer'],
  };

  const parentB: PetGenotype = {
    color: { dominant: 'Blue', recessive: 'blue' },
    pattern: { dominant: 'Spotted', recessive: 'spotted' },
    size: { dominant: 'medium', recessive: 'small' },
    temperament: { dominant: 'curious', recessive: 'calm' },
    specialTraits: ['leader', 'jumper'],
  };

  it('should derive phenotype from dominant alleles', () => {
    expect(derivePhenotype(parentA)).toEqual({
      color: 'Green',
      pattern: 'Striped',
      size: 'large',
      temperament: 'active',
      specialTraits: ['jumper', 'singer'],
    });
  });

  it('should calculate offspring genotype and phenotype via Punnett-style inheritance', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.9)
      .mockReturnValueOnce(0.9)
      .mockReturnValueOnce(0.9)
      .mockReturnValueOnce(0.9)
      .mockReturnValueOnce(0.9)
      .mockReturnValueOnce(0.9)
      .mockReturnValueOnce(0.9)
      .mockReturnValueOnce(0.9);

    const offspring = calculatePunnettOffspring(parentA, parentB);

    expect(offspring.genotype.color).toEqual({ dominant: 'Green', recessive: 'Blue' });
    expect(offspring.genotype.pattern).toEqual({ dominant: 'Striped', recessive: 'Spotted' });
    expect(offspring.phenotype.color).toBe('Green');
    expect(offspring.phenotype.pattern).toBe('Striped');
    expect(offspring.phenotype.specialTraits).toEqual(['jumper', 'singer', 'leader']);
  });

  it('should convert phenotype to legacy PetGene format', () => {
    const legacy = toLegacyGene({
      color: 'Green',
      pattern: 'Striped',
      size: 'large',
      temperament: 'active',
      specialTraits: ['jumper'],
    });

    expect(legacy).toEqual({
      color: 'Green',
      pattern: 'Striped',
      size: 'large',
      temperament: 'active',
      specialTraits: ['jumper'],
    });
  });

  it('should merge unique special traits only once', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0);
    const offspring = calculatePunnettOffspring(parentA, parentB);
    expect(offspring.genotype.specialTraits).toEqual(['jumper', 'singer', 'leader']);
  });
});
