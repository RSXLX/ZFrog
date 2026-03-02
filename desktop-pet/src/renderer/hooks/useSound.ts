import { useCallback, useRef } from 'react';

// Sound effect types
type SoundType = 'pet' | 'poke' | 'eat' | 'happy' | 'sad' | 'excited' | 'bubble';

// In production, these would be actual audio files
// For now, we use Web Audio API to generate simple tones
class SoundEngine {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  play(type: SoundType) {
    if (!this.enabled || !this.audioContext) return;

    // Resume context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const now = this.audioContext.currentTime;

    switch (type) {
      case 'pet':
        this.playTone(800, 0.1, 'sine', 0.2);
        break;
      case 'poke':
        this.playTone(200, 0.15, 'square', 0.15);
        break;
      case 'eat':
        this.playTone(400, 0.05, 'sine', 0.1);
        setTimeout(() => this.playTone(500, 0.05, 'sine', 0.1), 100);
        break;
      case 'happy':
        this.playTone(600, 0.1, 'sine', 0.2);
        setTimeout(() => this.playTone(800, 0.15, 'sine', 0.2), 100);
        break;
      case 'sad':
        this.playTone(400, 0.2, 'sine', 0.15);
        setTimeout(() => this.playTone(300, 0.2, 'sine', 0.1), 200);
        break;
      case 'excited':
        this.playTone(600, 0.1, 'sine', 0.2);
        setTimeout(() => this.playTone(800, 0.1, 'sine', 0.2), 80);
        setTimeout(() => this.playTone(1000, 0.15, 'sine', 0.2), 160);
        break;
      case 'bubble':
        this.playTone(500, 0.1, 'sine', 0.15);
        break;
    }
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.2) {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + duration);
  }
}

// Singleton instance
let soundEngine: SoundEngine | null = null;

function getSoundEngine(): SoundEngine {
  if (!soundEngine) {
    soundEngine = new SoundEngine();
  }
  return soundEngine;
}

export function useSound() {
  const engineRef = useRef(getSoundEngine());

  const play = useCallback((type: SoundType) => {
    engineRef.current.play(type);
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    engineRef.current.setEnabled(enabled);
  }, []);

  return { play, setEnabled };
}
