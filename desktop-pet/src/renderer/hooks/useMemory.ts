import { useState, useCallback, useEffect } from 'react';

interface Memory {
  id: string;
  type: 'interaction' | 'event' | 'mood';
  content: string;
  timestamp: number;
  importance: number;
}

export function useMemory() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [dialogueHistory, setDialogueHistory] = useState<{role: 'user' | 'frog', content: string, timestamp: number}[]>([]);

  // Save interaction to memory
  const remember = useCallback((type: Memory['type'], content: string, importance: number = 0.5) => {
    const memory: Memory = {
      id: `mem_${Date.now()}`,
      type,
      content,
      timestamp: Date.now(),
      importance,
    };
    
    setMemories(prev => {
      const newMemories = [...prev, memory];
      // Keep only last 50 memories
      return newMemories.slice(-50);
    });
    
    // Persist to localStorage
    try {
      localStorage.setItem('zfrog_memories', JSON.stringify(memories.slice(-50)));
    } catch (e) {
      console.warn('Failed to persist memories:', e);
    }
  }, []);

  // Load memories from storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('zfrog_memories');
      if (saved) {
        setMemories(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load memories:', e);
    }
  }, []);

  // Add dialogue
  const addDialogue = useCallback((role: 'user' | 'frog', content: string) => {
    setDialogueHistory(prev => {
      const newHistory = [...prev, { role, content, timestamp: Date.now() }];
      return newHistory.slice(-20); // Keep last 20 messages
    });
    remember('interaction', `${role}: ${content}`, 0.6);
  }, [remember]);

  // Get recent memories
  const getRecentMemories = useCallback((count: number = 5) => {
    return [...memories]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, count);
  }, [memories]);

  // Get mood summary
  const getMoodSummary = useCallback(() => {
    const moodMemories = memories.filter(m => m.type === 'mood');
    if (moodMemories.length === 0) return 'neutral';
    
    const lastMood = moodMemories[moodMemories.length - 1];
    return lastMood.content;
  }, [memories]);

  return {
    memories,
    dialogueHistory,
    remember,
    addDialogue,
    getRecentMemories,
    getMoodSummary,
  };
}
