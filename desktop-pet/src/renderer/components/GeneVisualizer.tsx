import React, { useMemo, useState } from 'react';
import { PetGene } from '../hooks/usePetEgg';
import { PetGenotype } from '../hooks/genetics';
import { isMutationTrait } from '../hooks/mutationRules';
import './GeneVisualizer.css';

interface GeneVisualizerProps {
  gene: PetGene;
  generation: number;
  genotype?: PetGenotype;
}

const colorMap: Record<string, string> = {
  green: '#4CAF50',
  blue: '#2196F3',
  yellow: '#FFEB3B',
  red: '#F44336',
  purple: '#9C27B0',
  orange: '#FF9800',
  gold: '#FFD700',
  cyan: '#00BCD4',
};

const GeneVisualizer: React.FC<GeneVisualizerProps> = ({ gene, generation, genotype }) => {
  const [view, setView] = useState<'phenotype' | 'genotype'>('phenotype');

  const fallbackGenotype = useMemo<PetGenotype>(() => ({
    color: { dominant: gene.color, recessive: gene.color.toLowerCase() },
    pattern: { dominant: gene.pattern, recessive: gene.pattern.toLowerCase() },
    size: { dominant: gene.size, recessive: String(gene.size).toLowerCase() },
    temperament: { dominant: gene.temperament, recessive: String(gene.temperament).toLowerCase() },
    specialTraits: gene.specialTraits,
  }), [gene]);

  const activeGenotype = genotype ?? fallbackGenotype;

  return (
    <div className="gene-visualizer">
      <div className="gene-header-row">
        <h3>🧬 基因图谱 (第 {generation} 代)</h3>
        <div className="gene-view-toggle">
          <button
            className={view === 'phenotype' ? 'active' : ''}
            onClick={() => setView('phenotype')}
          >
            表现型
          </button>
          <button
            className={view === 'genotype' ? 'active' : ''}
            onClick={() => setView('genotype')}
          >
            基因型
          </button>
        </div>
      </div>

      {view === 'phenotype' ? (
        <div className="gene-grid">
          <div className="gene-item">
            <span className="gene-label">主色调</span>
            <div className="gene-value color-badge" style={{ backgroundColor: colorMap[gene.color] || gene.color }}>
              {gene.color}
            </div>
          </div>
          <div className="gene-item">
            <span className="gene-label">花纹</span>
            <span className="gene-value">{gene.pattern}</span>
          </div>
          <div className="gene-item">
            <span className="gene-label">体型</span>
            <span className="gene-value">{gene.size}</span>
          </div>
          <div className="gene-item">
            <span className="gene-label">性格倾向</span>
            <span className="gene-value">{gene.temperament}</span>
          </div>
        </div>
      ) : (
        <div className="gene-grid genotype-grid">
          <div className="gene-item">
            <span className="gene-label">颜色位点</span>
            <span className="gene-value mono">{activeGenotype.color.dominant} / {activeGenotype.color.recessive}</span>
          </div>
          <div className="gene-item">
            <span className="gene-label">花纹位点</span>
            <span className="gene-value mono">{activeGenotype.pattern.dominant} / {activeGenotype.pattern.recessive}</span>
          </div>
          <div className="gene-item">
            <span className="gene-label">体型位点</span>
            <span className="gene-value mono">{activeGenotype.size.dominant} / {activeGenotype.size.recessive}</span>
          </div>
          <div className="gene-item">
            <span className="gene-label">性格位点</span>
            <span className="gene-value mono">{activeGenotype.temperament.dominant} / {activeGenotype.temperament.recessive}</span>
          </div>
        </div>
      )}

      {gene.specialTraits.length > 0 && (
        <div className="special-traits">
          <h4>{view === 'phenotype' ? '🌟 特殊显性特征' : '🧪 特殊特征位点'}</h4>
          <div className="traits-list">
            {gene.specialTraits.map((trait, index) => (
              <span key={index} className={`trait-badge ${isMutationTrait(trait) ? 'mutation-trait' : ''}`}>
                {isMutationTrait(trait) ? '✨ ' : ''}{trait}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneVisualizer;
