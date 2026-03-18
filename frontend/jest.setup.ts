import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import React from 'react';

// Polyfill for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    query: {},
    pathname: '/',
    asPath: '/',
  }),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  constructor(callback: any) {
    this.callback = callback;
  }
  callback: any;
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: class MockResizeObserver {
    observe = jest.fn();
    unobserve = jest.fn();
    disconnect = jest.fn();
  },
});

window.requestAnimationFrame = (callback: FrameRequestCallback) => {
  return window.setTimeout(() => callback(performance.now()), 16);
};

window.cancelAnimationFrame = (id: number) => {
  window.clearTimeout(id);
};

window.scrollTo = jest.fn();

jest.mock('framer-motion', () => {
  const motionProps = new Set([
    'animate',
    'exit',
    'initial',
    'layout',
    'layoutId',
    'transition',
    'viewport',
    'whileHover',
    'whileInView',
    'whileTap',
  ]);

  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string) =>
        React.forwardRef(({ children, ...props }: any, ref: React.Ref<any>) => {
          const cleanProps = Object.fromEntries(
            Object.entries(props).filter(([key]) => !motionProps.has(key))
          );

          return React.createElement(tag, { ref, ...cleanProps }, children);
        }),
    }
  );

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    motion,
    useInView: () => true,
  };
});

// Suppress console errors during tests
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('ReactDOM.render') ||
      args[0].includes('act(...)') ||
      args[0].includes('React does not recognize'))
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};
