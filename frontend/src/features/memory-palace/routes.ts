interface MemoryPalaceRouteOptions {
  legacyPath?: string | null;
}

export const buildMemoryPalacePath = (
  frogId: number | string,
  _options: MemoryPalaceRouteOptions = {}
): string => {
  return `/memory-palace/${frogId}`;
};
