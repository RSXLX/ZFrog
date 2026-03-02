import { useState, useCallback } from 'react';

// Simple AI response system (can be expanded with real AI API)
export interface AIResponse {
  text: string;
  emotion: 'happy' | 'sad' | 'excited' | 'neutral' | 'angry';
  action?: string;
}

const responseDatabase: Record<string, { responses: string[]; emotion: AIResponse['emotion'] }> = {
  greeting: {
    responses: ['你好呀！', '嗨！', '你好！', '哎呀，是你呀~'],
    emotion: 'happy',
  },
  pet: {
    responses: ['好舒服呀~', '再摸摸我', '嗯~真舒服', '继续嘛~'],
    emotion: 'happy',
  },
  feed: {
    responses: ['好吃！', '谢谢你！', '真美味~', '还要还要！'],
    emotion: 'excited',
  },
  poke: {
    responses: ['哎呀！', '干嘛呀~', '不要戳我嘛', '好疼呀~'],
    emotion: 'sad',
  },
  happy: {
    responses: ['我好开心呀！', '今天心情真好！', '有你真好~', '嘿嘿~'],
    emotion: 'happy',
  },
  sad: {
    responses: ['呜呜...', '我有点难过', '怎么了呀...', '不舒服...'],
    emotion: 'sad',
  },
  lonely: {
    responses: ['陪我玩嘛~', '好无聊呀', '你怎么才来呀', '带我出去玩吧~'],
    emotion: 'sad',
  },
  night: {
    responses: ['晚安~', '要睡觉啦', '明天见~', '好困呀...'],
    emotion: 'neutral',
  },
  morning: {
    responses: ['早上好！', '新的一天开始啦！', '你好呀~', '太阳晒屁股啦！'],
    emotion: 'excited',
  },
};

export function usePetAI() {
  const [isAIEnabled, setIsAIEnabled] = useState(true);

  const getResponse = useCallback((context: string): AIResponse => {
    if (!isAIEnabled) {
      return { text: '...', emotion: 'neutral' };
    }

    const key = context.toLowerCase();
    let matched = responseDatabase[key];

    // Try to find a close match
    if (!matched) {
      if (key.includes('hello') || key.includes('hi') || key.includes('你好')) {
        matched = responseDatabase.greeting;
      } else if (key.includes('pet') || key.includes('摸') || key.includes('舒服')) {
        matched = responseDatabase.pet;
      } else if (key.includes('eat') || key.includes('吃') || key.includes('喂')) {
        matched = responseDatabase.feed;
      } else if (key.includes('poke') || key.includes('戳') || key.includes('戳')) {
        matched = responseDatabase.poke;
      } else {
        // Random neutral response
        matched = responseDatabase.greeting;
      }
    }

    const responseText = matched.responses[Math.floor(Math.random() * matched.responses.length)];

    return {
      text: responseText,
      emotion: matched.emotion,
    };
  }, [isAIEnabled]);

  const toggleAI = useCallback(() => {
    setIsAIEnabled(prev => !prev);
  }, []);

  return { getResponse, isAIEnabled, toggleAI, responseDatabase };
}
