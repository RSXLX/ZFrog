import { useState, useEffect, useCallback } from 'react';

export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  target?: string;
}

const defaultTutorial: TutorialStep[] = [
  { id: 'welcome', title: '欢迎!', content: '我是你的桌面宠物 ZetaFrog~', position: 'center' },
  { id: 'pet', title: '互动', content: '点击我的头可以抚摸我~', position: 'top' },
  { id: 'feed', title: '喂食', content: '点击嘴巴可以喂我吃东西', position: 'top' },
  { id: 'menu', title: '菜单', content: '点击右下角菜单可以打开更多功能', position: 'left' },
  { id: 'drag', title: '移动', content: '按住我可以拖动到任何位置', position: 'bottom' },
];

export function useTutorial() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  // Load from storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('zfrog_tutorial_completed');
      if (saved) {
        const completed = JSON.parse(saved);
        setCompletedSteps(completed);
        if (completed.length < defaultTutorial.length) {
          setCurrentStep(completed.length);
          setIsActive(true);
        }
      } else {
        setIsActive(true);
      }
    } catch (e) {
      setIsActive(true);
    }
  }, []);

  // Save to storage
  useEffect(() => {
    try {
      localStorage.setItem('zfrog_tutorial_completed', JSON.stringify(completedSteps));
    } catch (e) {
      console.warn('Failed to save tutorial progress:', e);
    }
  }, [completedSteps]);

  const nextStep = useCallback(() => {
    const step = defaultTutorial[currentStep];
    if (step) {
      setCompletedSteps(prev => [...prev, step.id]);
    }
    
    if (currentStep < defaultTutorial.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setIsActive(false);
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const skipTutorial = useCallback(() => {
    setIsActive(false);
    setCompletedSteps(defaultTutorial.map(s => s.id));
  }, []);

  const resetTutorial = useCallback(() => {
    setCurrentStep(0);
    setCompletedSteps([]);
    setIsActive(true);
  }, []);

  const getCurrentStep = useCallback(() => {
    return defaultTutorial[currentStep];
  }, [currentStep]);

  return {
    currentStep: getCurrentStep(),
    totalSteps: defaultTutorial.length,
    isActive,
    nextStep,
    prevStep,
    skipTutorial,
    resetTutorial,
    progress: (completedSteps.length / defaultTutorial.length) * 100,
  };
}
