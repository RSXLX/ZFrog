import type {
  V3MemoryPalaceTemplateReadModel,
  V3MemoryPalaceWorldReadModel,
} from '../../../../../packages/shared/src';
import {
  DEFAULT_MEMORY_WORLD_THEME,
  MEMORY_WORLD_THEME_PRESETS,
  type MemoryWorldThemePalette,
} from './presets';

export interface ResolvedMemoryWorldTheme {
  source: 'template' | 'preset' | 'fallback';
  slug: string | null;
  badgeLabel: string | null;
  coverImageUrl: string | null;
  palette: MemoryWorldThemePalette;
}

const isHexColor = (value: unknown): value is string =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim());

const sanitizePalette = (palette: unknown): MemoryWorldThemePalette | null => {
  if (!palette || typeof palette !== 'object' || Array.isArray(palette)) {
    return null;
  }

  const value = palette as Record<string, unknown>;
  if (!isHexColor(value.background)) {
    return null;
  }
  if (!isHexColor(value.surface)) {
    return null;
  }
  if (!isHexColor(value.accent)) {
    return null;
  }
  if (!isHexColor(value.text)) {
    return null;
  }

  return {
    background: value.background.trim().toLowerCase(),
    surface: value.surface.trim().toLowerCase(),
    accent: value.accent.trim().toLowerCase(),
    text: value.text.trim().toLowerCase(),
  };
};

export const resolveMemoryWorldTheme = (input: {
  world: V3MemoryPalaceWorldReadModel | null;
  templates?: V3MemoryPalaceTemplateReadModel[];
}): ResolvedMemoryWorldTheme => {
  const templateSlug = input.world?.templateSlug?.trim().toLowerCase() || null;

  if (!templateSlug) {
    return {
      source: 'fallback',
      slug: null,
      badgeLabel: DEFAULT_MEMORY_WORLD_THEME.badgeLabel,
      coverImageUrl: DEFAULT_MEMORY_WORLD_THEME.coverImageUrl,
      palette: DEFAULT_MEMORY_WORLD_THEME.palette,
    };
  }

  const reviewedTemplate = (input.templates || []).find(
    (item) => item.slug.trim().toLowerCase() === templateSlug
  );
  if (reviewedTemplate && reviewedTemplate.featureEnabled && reviewedTemplate.status === 'PUBLISHED') {
    const palette = sanitizePalette(reviewedTemplate.theme.palette);
    if (palette) {
      return {
        source: 'template',
        slug: reviewedTemplate.slug,
        badgeLabel: reviewedTemplate.theme.badgeLabel,
        coverImageUrl: reviewedTemplate.theme.coverImageUrl,
        palette,
      };
    }
  }

  const preset = MEMORY_WORLD_THEME_PRESETS[templateSlug];
  if (preset) {
    return {
      source: 'preset',
      slug: preset.slug,
      badgeLabel: preset.badgeLabel,
      coverImageUrl: preset.coverImageUrl,
      palette: preset.palette,
    };
  }

  return {
    source: 'fallback',
    slug: templateSlug,
    badgeLabel: DEFAULT_MEMORY_WORLD_THEME.badgeLabel,
    coverImageUrl: DEFAULT_MEMORY_WORLD_THEME.coverImageUrl,
    palette: DEFAULT_MEMORY_WORLD_THEME.palette,
  };
};
