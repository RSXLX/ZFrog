import { useCallback, useEffect, useState } from 'react';

export interface CollectedPetEntry {
  id: string;
  name: string;
  stage: string;
  generation: number;
  collectedAt: number;
  color: string;
  pattern: string;
  size: string;
  temperament: string;
  specialTraits: string[];
  mutationTraits: string[];
}

interface CollectionState {
  entries: CollectedPetEntry[];
}

const STORAGE_KEY = 'zfrog_collection_book';

export function useCollectionBook() {
  const [state, setState] = useState<CollectionState>({ entries: [] });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const collectPet = useCallback((entry: CollectedPetEntry) => {
    setState(prev => {
      if (prev.entries.some(e => e.id === entry.id)) return prev;
      return { entries: [entry, ...prev.entries] };
    });
  }, []);

  const hasMutationCollection = useCallback(() => {
    return state.entries.some(entry => entry.mutationTraits.length > 0);
  }, [state.entries]);

  return {
    collection: state.entries,
    collectPet,
    hasMutationCollection,
  };
}
