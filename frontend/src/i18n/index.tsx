import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type SupportedLocale = 'zh-CN' | 'en-US';

type MessageParams = Record<string, string | number>;

type MessageDict = Record<string, string>;

const STORAGE_KEY = 'zfrog.locale';
const FALLBACK_LOCALE: SupportedLocale = 'en-US';

const messages: Record<SupportedLocale, MessageDict> = {
  'zh-CN': {
    'locale.zh-CN': '简体中文',
    'locale.en-US': 'English',
    'locale.switchLabel': '切换语言',
    'navbar.walletConnected': '已连接',
    'app.footer.line1': '🐸 ZetaFrog - 跨链跳跃，收集故事',
    'app.footer.line2': '在 ZetaChain 上构建',
  },
  'en-US': {
    'locale.zh-CN': '简体中文',
    'locale.en-US': 'English',
    'locale.switchLabel': 'Switch language',
    'navbar.walletConnected': 'Connected',
    'app.footer.line1': '🐸 ZetaFrog - Hop Across Chains, Collect Stories',
    'app.footer.line2': 'Built on ZetaChain',
  },
};

function normalizeLocale(raw?: string | null): SupportedLocale | null {
  if (!raw) {
    return null;
  }

  const value = raw.trim().toLowerCase();
  if (value === 'zh' || value.startsWith('zh-')) {
    return 'zh-CN';
  }

  if (value === 'en' || value.startsWith('en-')) {
    return 'en-US';
  }

  return null;
}

function resolveInitialLocale(): SupportedLocale {
  if (typeof window === 'undefined') {
    return FALLBACK_LOCALE;
  }

  const stored = normalizeLocale(window.localStorage.getItem(STORAGE_KEY));
  if (stored) {
    return stored;
  }

  const browserLang =
    normalizeLocale(window.navigator.languages?.[0]) ||
    normalizeLocale(window.navigator.language);
  if (browserLang) {
    return browserLang;
  }

  return FALLBACK_LOCALE;
}

function interpolate(template: string, params?: MessageParams): string {
  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key];
    return value === undefined || value === null ? '' : String(value);
  });
}

function getMessage(locale: SupportedLocale, key: string): string {
  return messages[locale][key] || messages[FALLBACK_LOCALE][key] || key;
}

interface I18nContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string, params?: MessageParams) => string;
  tr: (zhText: string, enText: string, params?: MessageParams) => string;
  formatNumber: (value: number | bigint) => string;
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function createValue(
  locale: SupportedLocale,
  setLocale: (locale: SupportedLocale) => void
): I18nContextValue {
  return {
    locale,
    setLocale,
    t: (key, params) => interpolate(getMessage(locale, key), params),
    tr: (zhText, enText, params) =>
      interpolate(locale === 'zh-CN' ? zhText : enText, params),
    formatNumber: (value) => {
      const numberValue = typeof value === 'bigint' ? Number(value) : value;
      return Number.isFinite(numberValue)
        ? new Intl.NumberFormat(locale).format(numberValue)
        : String(value);
    },
    formatDate: (date, options) => {
      const resolved = date instanceof Date ? date : new Date(date);
      if (Number.isNaN(resolved.getTime())) {
        return String(date);
      }
      return new Intl.DateTimeFormat(locale, options).format(resolved);
    },
  };
}

export function I18nProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale?: SupportedLocale;
}) {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => {
    return initialLocale || resolveInitialLocale();
  });

  const setLocale = useCallback((nextLocale: SupportedLocale) => {
    setLocaleState(nextLocale);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, locale);
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const value = useMemo(() => createValue(locale, setLocale), [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (context) {
    return context;
  }

  const locale = resolveInitialLocale();
  return createValue(locale, () => undefined);
}
