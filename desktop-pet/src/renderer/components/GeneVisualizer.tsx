import React from 'react';
import { PetGene } from '../hooks/usePetEgg';
import './GeneVisualizer.css';

interface GeneVisualizerProps {
  gene: PetGene;
  generation: number;
}

const colorMap: Record<string, string> = {
  green: '#4CAF50',
  blue: '#2196F3',
  yellow: '#FFEB3B',
  red: '#F44336',
  purple: '#9C27B0',
  orange: '#FF9800',
  gold: '#FFD700', // Rare
  cyan: '#00BCD4', // Rare
};

const GeneVisualizer: React.FC<GeneVisualizerProps> = ({ gene, generation }) => {
  return (
    <div className="gene-visualizer">
      <h3>🧬 基因图谱 (第 {generation} 代)</h3>
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
      
      {gene.specialTraits.length > 0 && (
        <div className="special-traits">
          <h4>🌟 特殊显性特征</h4>
          <div className="traits-list">
            {gene.specialTraits.map((trait, index) => (
              <span key={index} className="trait-badge">{trait}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneVisualizer;
