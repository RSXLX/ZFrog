export type HeaderMap = Record<string, string>;

export type SessionHeaderResolver = () => HeaderMap | undefined | Promise<HeaderMap | undefined>;

export const emptySessionHeaders: SessionHeaderResolver = () => undefined;

export const mergeHeaders = (...sources: Array<HeaderMap | undefined>): HeaderMap => {
  const merged: HeaderMap = {};

  for (const source of sources) {
    if (!source) {
      continue;
    }

    for (const [key, value] of Object.entries(source)) {
      if (!value) {
        continue;
      }
      merged[key] = value;
    }
  }

  return merged;
};
