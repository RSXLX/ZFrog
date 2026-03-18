export type GeneAllele = string;

export interface GenePair {
  dominant: GeneAllele;
  recessive: GeneAllele;
}

export interface PetGenotype {
  color: GenePair;
  pattern: GenePair;
  size: GenePair;
  temperament: GenePair;
  specialTraits: GeneAllele[];
}

export interface PetPhenotype {
  color: string;
  pattern: string;
  size: string;
  temperament: string;
  specialTraits: string[];
}

export interface OffspringGeneticsResult {
  genotype: PetGenotype;
  phenotype: PetPhenotype;
  inheritedFrom: Record<string, [GeneAllele, GeneAllele]>;
}

function resolveVisibleTrait(pair: GenePair): string {
  return pair.dominant || pair.recessive;
}

function inheritPair(a: GenePair, b: GenePair): { pair: GenePair; inherited: [GeneAllele, GeneAllele] } {
  const fromA = Math.random() > 0.5 ? a.dominant : a.recessive;
  const fromB = Math.random() > 0.5 ? b.dominant : b.recessive;

  const dominant = fromA === fromA.toUpperCase() ? fromA : fromB;
  const recessive = dominant === fromA ? fromB : fromA;

  return {
    pair: { dominant, recessive },
    inherited: [fromA, fromB],
  };
}

export function derivePhenotype(genotype: PetGenotype): PetPhenotype {
  return {
    color: resolveVisibleTrait(genotype.color),
    pattern: resolveVisibleTrait(genotype.pattern),
    size: resolveVisibleTrait(genotype.size),
    temperament: resolveVisibleTrait(genotype.temperament),
    specialTraits: genotype.specialTraits,
  };
}

export function calculatePunnettOffspring(parentA: PetGenotype, parentB: PetGenotype): OffspringGeneticsResult {
  const color = inheritPair(parentA.color, parentB.color);
  const pattern = inheritPair(parentA.pattern, parentB.pattern);
  const size = inheritPair(parentA.size, parentB.size);
  const temperament = inheritPair(parentA.temperament, parentB.temperament);

  const genotype: PetGenotype = {
    color: color.pair,
    pattern: pattern.pair,
    size: size.pair,
    temperament: temperament.pair,
    specialTraits: [...new Set([...parentA.specialTraits, ...parentB.specialTraits])].slice(0, 4),
  };

  return {
    genotype,
    phenotype: derivePhenotype(genotype),
    inheritedFrom: {
      color: color.inherited,
      pattern: pattern.inherited,
      size: size.inherited,
      temperament: temperament.inherited,
    },
  };
}

export function toLegacyGene(phenotype: PetPhenotype) {
  return {
    color: phenotype.color,
    pattern: phenotype.pattern,
    size: phenotype.size as 'small' | 'medium' | 'large',
    temperament: phenotype.temperament as 'calm' | 'active' | 'curious',
    specialTraits: phenotype.specialTraits,
  };
}
