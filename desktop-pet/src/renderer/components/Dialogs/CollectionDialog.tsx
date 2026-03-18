import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { CollectedPetEntry } from '../../hooks/useCollectionBook';

interface CollectionDialogProps {
  visible: boolean;
  onClose: () => void;
  entries: CollectedPetEntry[];
}

type SortMode = 'newest' | 'oldest' | 'generation';

const stageLabels: Record<string, string> = {
  egg: '宠物蛋',
  tadpole: '蝌蚪',
  young_frog: '幼蛙',
  adult_frog: '成蛙',
};

function formatStage(stage: string) {
  return stageLabels[stage] || stage;
}

const CollectionDialog = ({ visible, onClose, entries }: CollectionDialogProps) => {
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [mutationOnly, setMutationOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const stageOptions = useMemo(
    () => ['all', ...Array.from(new Set(entries.map(entry => entry.stage)))],
    [entries]
  );

  const filteredEntries = useMemo(() => {
    const nextEntries = entries.filter(entry => {
      if (stageFilter !== 'all' && entry.stage !== stageFilter) return false;
      if (mutationOnly && entry.mutationTraits.length === 0) return false;
      return true;
    });

    nextEntries.sort((a, b) => {
      if (sortMode === 'oldest') return a.collectedAt - b.collectedAt;
      if (sortMode === 'generation') return b.generation - a.generation;
      return b.collectedAt - a.collectedAt;
    });

    return nextEntries;
  }, [entries, stageFilter, mutationOnly, sortMode]);

  const selectedEntry = filteredEntries.find(entry => entry.id === selectedId) || filteredEntries[0] || null;

  const stats = useMemo(() => {
    const mutationCount = entries.filter(entry => entry.mutationTraits.length > 0).length;
    const generations = Array.from(new Set(entries.map(entry => entry.generation))).length;

    return {
      total: entries.length,
      mutationCount,
      generations,
    };
  }, [entries]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          onClick={(event) => event.stopPropagation()}
          style={{
            width: 860,
            maxWidth: '92vw',
            maxHeight: '88vh',
            overflow: 'hidden',
            borderRadius: 20,
            background: 'linear-gradient(180deg, #f8fafc 0%, #ecfccb 100%)',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.2fr) minmax(280px, 0.8fr)',
            boxShadow: '0 24px 60px rgba(15, 23, 42, 0.32)',
          }}
        >
          <div style={{ padding: 20, borderRight: '1px solid rgba(148,163,184,0.24)', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, color: '#14532d' }}>📚 收集图鉴</h2>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  已记录成长、繁殖和变异带来的桌宠条目
                </div>
              </div>
              <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
              <div style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.8)' }}>
                <div style={{ fontSize: 12, color: '#64748b' }}>总条目</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{stats.total}</div>
              </div>
              <div style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.8)' }}>
                <div style={{ fontSize: 12, color: '#64748b' }}>变异条目</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#7c3aed' }}>{stats.mutationCount}</div>
              </div>
              <div style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.8)' }}>
                <div style={{ fontSize: 12, color: '#64748b' }}>世代覆盖</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{stats.generations}</div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                padding: 12,
                borderRadius: 14,
                background: 'rgba(255,255,255,0.72)',
                marginBottom: 16,
              }}
            >
              {stageOptions.map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setStageFilter(option)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 999,
                    border: 'none',
                    cursor: 'pointer',
                    background: stageFilter === option ? '#166534' : '#e2e8f0',
                    color: stageFilter === option ? 'white' : '#334155',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {option === 'all' ? '全部阶段' : formatStage(option)}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setMutationOnly(value => !value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 999,
                  border: mutationOnly ? '1px solid #7c3aed' : '1px solid transparent',
                  cursor: 'pointer',
                  background: mutationOnly ? '#f3e8ff' : '#e2e8f0',
                  color: mutationOnly ? '#6d28d9' : '#334155',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                只看变异
              </button>

              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                style={{
                  marginLeft: 'auto',
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  background: 'white',
                  color: '#334155',
                }}
              >
                <option value="newest">最新获得</option>
                <option value="oldest">最早获得</option>
                <option value="generation">优先高世代</option>
              </select>
            </div>

            {filteredEntries.length === 0 ? (
              <div
                style={{
                  padding: 24,
                  borderRadius: 16,
                  background: 'rgba(255,255,255,0.72)',
                  color: '#475569',
                  textAlign: 'center',
                  lineHeight: 1.7,
                }}
              >
                当前筛选下还没有记录。
                <br />
                继续繁殖、旅行和培养，新的图鉴条目会在这里出现。
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
                {filteredEntries.map(entry => {
                  const isSelected = entry.id === selectedEntry?.id;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setSelectedId(entry.id)}
                      style={{
                        textAlign: 'left',
                        padding: 14,
                        borderRadius: 14,
                        border: `1px solid ${isSelected ? '#16a34a' : 'rgba(148,163,184,0.26)'}`,
                        background: isSelected ? '#f0fdf4' : 'rgba(255,255,255,0.78)',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: 28 }}>{entry.mutationTraits.length > 0 ? '✨' : '🐸'}</span>
                        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>第 {entry.generation} 代</span>
                      </div>
                      <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{entry.name}</div>
                      <div style={{ fontSize: 12, color: '#475569', marginBottom: 8 }}>{formatStage(entry.stage)}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        <span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 999, background: '#dcfce7', color: '#166534' }}>
                          {entry.color}
                        </span>
                        <span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 999, background: '#e0f2fe', color: '#0369a1' }}>
                          {entry.pattern}
                        </span>
                        {entry.mutationTraits.length > 0 ? (
                          <span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 999, background: '#f3e8ff', color: '#6d28d9' }}>
                            变异 {entry.mutationTraits.length}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ padding: 20, overflow: 'auto', background: 'rgba(255,255,255,0.46)' }}>
            {selectedEntry ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 18,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 34,
                      background: selectedEntry.mutationTraits.length > 0 ? '#f3e8ff' : '#dcfce7',
                    }}
                  >
                    {selectedEntry.mutationTraits.length > 0 ? '✨' : '🐸'}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, color: '#0f172a' }}>{selectedEntry.name}</h3>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                      {formatStage(selectedEntry.stage)} · 第 {selectedEntry.generation} 代
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  <div style={{ padding: 10, borderRadius: 12, background: '#f8fafc' }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>主色</div>
                    <div style={{ fontWeight: 700 }}>{selectedEntry.color}</div>
                  </div>
                  <div style={{ padding: 10, borderRadius: 12, background: '#f8fafc' }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>花纹</div>
                    <div style={{ fontWeight: 700 }}>{selectedEntry.pattern}</div>
                  </div>
                  <div style={{ padding: 10, borderRadius: 12, background: '#f8fafc' }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>体型</div>
                    <div style={{ fontWeight: 700 }}>{selectedEntry.size}</div>
                  </div>
                  <div style={{ padding: 10, borderRadius: 12, background: '#f8fafc' }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>性格</div>
                    <div style={{ fontWeight: 700 }}>{selectedEntry.temperament}</div>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>特殊特征</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {selectedEntry.specialTraits.length > 0 ? selectedEntry.specialTraits.map(trait => (
                      <span
                        key={trait}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 999,
                          background: selectedEntry.mutationTraits.includes(trait) ? '#f3e8ff' : '#dcfce7',
                          color: selectedEntry.mutationTraits.includes(trait) ? '#6d28d9' : '#166534',
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {selectedEntry.mutationTraits.includes(trait) ? '✨ ' : ''}
                        {trait}
                      </span>
                    )) : (
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>暂无特殊特征</span>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    background: selectedEntry.mutationTraits.length > 0 ? '#faf5ff' : '#f8fafc',
                    border: `1px solid ${selectedEntry.mutationTraits.length > 0 ? '#e9d5ff' : '#e2e8f0'}`,
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>变异状态</div>
                  <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.7 }}>
                    {selectedEntry.mutationTraits.length > 0
                      ? `已记录 ${selectedEntry.mutationTraits.length} 个变异特征，说明这一条目已经接入稀有变异收集链路。`
                      : '当前条目没有变异特征，适合作为基础谱系对照。'}
                  </div>
                </div>

                <div style={{ fontSize: 12, color: '#64748b' }}>
                  收集时间：{new Date(selectedEntry.collectedAt).toLocaleString()}
                </div>
              </>
            ) : (
              <div style={{ color: '#64748b', lineHeight: 1.7 }}>
                还没有任何图鉴条目，先去创建、培养或繁殖新的桌宠吧。
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CollectionDialog;
