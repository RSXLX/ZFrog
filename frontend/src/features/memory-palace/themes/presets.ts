export interface MemoryWorldThemePalette {
  background: string;
  surface: string;
  accent: string;
  text: string;
}

export interface MemoryWorldThemePreset {
  slug: string;
  badgeLabel: string | null;
  coverImageUrl: string | null;
  palette: MemoryWorldThemePalette;
}

export const DEFAULT_MEMORY_WORLD_THEME: MemoryWorldThemePreset = {
  slug: 'default-memory-world',
  badgeLabel: 'Default',
  coverImageUrl: null,
  palette: {
    background: '#ecfeff',
    surface: '#ffffff',
    accent: '#0ea5e9',
    text: '#0f172a',
  },
};

const PRESET_LIST: MemoryWorldThemePreset[] = [
  {
    slug: 'moonlake-celadon',
    badgeLabel: 'Moonlake',
    coverImageUrl: null,
    palette: {
      background: '#ecfeff',
      surface: '#f8fafc',
      accent: '#0ea5e9',
      text: '#082f49',
    },
  },
  {
    slug: 'amber-echoes',
    badgeLabel: 'Amber Echoes',
    coverImageUrl: null,
    palette: {
      background: '#fffbeb',
      surface: '#fff7d6',
      accent: '#d97706',
      text: '#422006',
    },
  },
];

export const MEMORY_WORLD_THEME_PRESETS = PRESET_LIST.reduce<Record<string, MemoryWorldThemePreset>>(
  (acc, item) => {
    acc[item.slug] = item;
    return acc;
  },
  {}
);
