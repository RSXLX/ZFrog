import { FrogState, AnimationConfig, ParticleConfig } from '../types/frogAnimation';

export const ANIMATION_CONFIGS: Record<FrogState, AnimationConfig> = {
  // 基础状态动画
  [FrogState.IDLE]: {
    frames: 4,
    duration: 2000,
    loop: true,
    sprites: [
      '/assets/frog/idle_1.png',
      '/assets/frog/idle_2.png',
      '/assets/frog/idle_3.png',
      '/assets/frog/idle_2.png',
    ],
    particles: null,
    sound: null,
  },
  
  [FrogState.SLEEPING]: {
    frames: 3,
    duration: 3000,
    loop: true,
    sprites: [
      '/assets/frog/sleep_1.png',
      '/assets/frog/sleep_2.png',
      '/assets/frog/sleep_3.png',
    ],
    particles: 'zzz',
    sound: '/sounds/snore.mp3',
  },
  
  [FrogState.EATING]: {
    frames: 5,
    duration: 1500,
    loop: false,
    sprites: [
      '/assets/frog/eat_1.png',
      '/assets/frog/eat_2.png',
      '/assets/frog/eat_3.png',
      '/assets/frog/eat_2.png',
      '/assets/frog/eat_1.png',
    ],
    particles: 'hearts',
    sound: '/sounds/eat.mp3',
  },
  
  [FrogState.WALKING]: {
    frames: 6,
    duration: 1000,
    loop: true,
    sprites: [
      '/assets/frog/walk_1.png',
      '/assets/frog/walk_2.png',
      '/assets/frog/walk_3.png',
      '/assets/frog/walk_4.png',
      '/assets/frog/walk_5.png',
      '/assets/frog/walk_6.png',
    ],
    particles: null,
    sound: null,
  },
  
  [FrogState.JUMPING]: {
    frames: 4,
    duration: 800,
    loop: false,
    sprites: [
      '/assets/frog/jump_1.png',
      '/assets/frog/jump_2.png',
      '/assets/frog/jump_3.png',
      '/assets/frog/jump_4.png',
    ],
    particles: 'stars',
    sound: '/sounds/jump.mp3',
  },
  
  // 旅行状态
  [FrogState.TRAVELING]: {
    frames: 8,
    duration: 2000,
    loop: true,
    sprites: [
      '/assets/frog/travel_1.png',
      '/assets/frog/travel_2.png',
      '/assets/frog/travel_3.png',
      '/assets/frog/travel_4.png',
      '/assets/frog/travel_5.png',
      '/assets/frog/travel_6.png',
      '/assets/frog/travel_7.png',
      '/assets/frog/travel_8.png',
    ],
    particles: 'music_notes',
    sound: '/sounds/travel.mp3',
  },
  
  [FrogState.RETURNING]: {
    frames: 6,
    duration: 1500,
    loop: true,
    sprites: [
      '/assets/frog/return_1.png',
      '/assets/frog/return_2.png',
      '/assets/frog/return_3.png',
      '/assets/frog/return_4.png',
      '/assets/frog/return_5.png',
      '/assets/frog/return_6.png',
    ],
    particles: 'hearts',
    sound: '/sounds/return.mp3',
  },
  
  [FrogState.WRITING]: {
    frames: 4,
    duration: 2000,
    loop: true,
    sprites: [
      '/assets/frog/write_1.png',
      '/assets/frog/write_2.png',
      '/assets/frog/write_3.png',
      '/assets/frog/write_2.png',
    ],
    particles: null,
    sound: '/sounds/writing.mp3',
  },
  
  // 链上事件反应
  [FrogState.EXCITED]: {
    frames: 6,
    duration: 800,
    loop: true,
    sprites: [
      '/assets/frog/excited_1.png',
      '/assets/frog/excited_2.png',
      '/assets/frog/excited_3.png',
      '/assets/frog/excited_4.png',
      '/assets/frog/excited_5.png',
      '/assets/frog/excited_6.png',
    ],
    particles: 'stars',
    sound: '/sounds/excited.mp3',
  },
  
  [FrogState.SCARED]: {
    frames: 4,
    duration: 500,
    loop: false,
    sprites: [
      '/assets/frog/scared_1.png',
      '/assets/frog/scared_2.png',
      '/assets/frog/scared_3.png',
      '/assets/frog/scared_4.png',
    ],
    particles: 'sweat',
    sound: '/sounds/scared.mp3',
  },
  
  [FrogState.RICH]: {
    frames: 8,
    duration: 1500,
    loop: true,
    sprites: [
      '/assets/frog/rich_1.png',
      '/assets/frog/rich_2.png',
      '/assets/frog/rich_3.png',
      '/assets/frog/rich_4.png',
      '/assets/frog/rich_5.png',
      '/assets/frog/rich_6.png',
      '/assets/frog/rich_7.png',
      '/assets/frog/rich_8.png',
    ],
    particles: 'coins',
    sound: '/sounds/cha-ching.mp3',
  },
  
  [FrogState.CURIOUS]: {
    frames: 5,
    duration: 1500,
    loop: true,
    sprites: [
      '/assets/frog/curious_1.png',
      '/assets/frog/curious_2.png',
      '/assets/frog/curious_3.png',
      '/assets/frog/curious_4.png',
      '/assets/frog/curious_5.png',
    ],
    particles: 'stars',
    sound: null,
  },
  
  [FrogState.DANCING]: {
    frames: 12,
    duration: 2000,
    loop: true,
    sprites: [
      '/assets/frog/dance_1.png',
      '/assets/frog/dance_2.png',
      '/assets/frog/dance_3.png',
      '/assets/frog/dance_4.png',
      '/assets/frog/dance_5.png',
      '/assets/frog/dance_6.png',
      '/assets/frog/dance_7.png',
      '/assets/frog/dance_8.png',
      '/assets/frog/dance_9.png',
      '/assets/frog/dance_10.png',
      '/assets/frog/dance_11.png',
      '/assets/frog/dance_12.png',
    ],
    particles: 'music_notes',
    sound: '/sounds/dance_music.mp3',
  },
  
  [FrogState.CRYING]: {
    frames: 4,
    duration: 1000,
    loop: true,
    sprites: [
      '/assets/frog/cry_1.png',
      '/assets/frog/cry_2.png',
      '/assets/frog/cry_3.png',
      '/assets/frog/cry_4.png',
    ],
    particles: 'tears',
    sound: '/sounds/cry.mp3',
  },
  
  // 互动状态
  [FrogState.HAPPY]: {
    frames: 5,
    duration: 1000,
    loop: true,
    sprites: [
      '/assets/frog/happy_1.png',
      '/assets/frog/happy_2.png',
      '/assets/frog/happy_3.png',
      '/assets/frog/happy_4.png',
      '/assets/frog/happy_5.png',
    ],
    particles: 'hearts',
    sound: '/sounds/happy.mp3',
  },
  
  [FrogState.ANGRY]: {
    frames: 4,
    duration: 800,
    loop: false,
    sprites: [
      '/assets/frog/angry_1.png',
      '/assets/frog/angry_2.png',
      '/assets/frog/angry_3.png',
      '/assets/frog/angry_4.png',
    ],
    particles: 'fire',
    sound: '/sounds/angry.mp3',
  },
  
  [FrogState.LOVE]: {
    frames: 6,
    duration: 1200,
    loop: true,
    sprites: [
      '/assets/frog/love_1.png',
      '/assets/frog/love_2.png',
      '/assets/frog/love_3.png',
      '/assets/frog/love_4.png',
      '/assets/frog/love_5.png',
      '/assets/frog/love_6.png',
    ],
    particles: 'hearts',
    sound: '/sounds/love.mp3',
  },
  
  [FrogState.THINKING]: {
    frames: 4,
    duration: 2000,
    loop: true,
    sprites: [
      '/assets/frog/think_1.png',
      '/assets/frog/think_2.png',
      '/assets/frog/think_3.png',
      '/assets/frog/think_2.png',
    ],
    particles: null,
    sound: null,
  },
};

// 粒子效果配置
export const PARTICLE_CONFIGS: Record<string, ParticleConfig> = {
  zzz: {
    emoji: '💤',
    count: 3,
    duration: 2000,
    direction: 'up',
    spread: 30,
  },
  stars: {
    emoji: '⭐',
    count: 8,
    duration: 1000,
    direction: 'burst',
    spread: 360,
  },
  coins: {
    emoji: '🪙',
    count: 15,
    duration: 1500,
    direction: 'up',
    spread: 60,
  },
  hearts: {
    emoji: '❤️',
    count: 5,
    duration: 1200,
    direction: 'up',
    spread: 45,
  },
  sweat: {
    emoji: '💦',
    count: 3,
    duration: 800,
    direction: 'right',
    spread: 20,
  },
  music_notes: {
    emoji: '🎵',
    count: 6,
    duration: 1500,
    direction: 'up',
    spread: 90,
  },
  fire: {
    emoji: '🔥',
    count: 10,
    duration: 1000,
    direction: 'up',
    spread: 45,
  },
  tears: {
    emoji: '😢',
    count: 4,
    duration: 1000,
    direction: 'down',
    spread: 30,
  },
};

// 默认青蛙精灵图（用于替代缺失的图片资源）
export const DEFAULT_FROG_SPRITE = '🐸';