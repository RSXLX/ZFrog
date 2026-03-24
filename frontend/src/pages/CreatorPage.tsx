import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  V3CreatorAssetReadModel,
  V3CreatorAssetType,
  V3CreatorCreateAssetPayload,
  V3CreatorPackReadModel,
  V3CreatorPackStatus,
} from '../../../packages/shared/src';
import {
  V3_CREATOR_ASSET_TYPES,
  V3_CREATOR_PACK_STATUSES,
} from '../../../packages/shared/src';
import { FeatureGateState } from '../components/common/FeatureGateState';
import { creatorFeatureApi } from '../features/creator/api';
import {
  getCreatorIntegrationApiKeySeed,
  isCreatorBetaEnabled,
} from '../features/creator/runtime';

const CREATOR_KEY_STORAGE = 'zfrog.v3.integrationApiKey';
const CHECKSUM_PATTERN = /^[a-f0-9]{16,128}$/i;

const ALLOWED_MIME_TYPES_BY_TYPE: Record<V3CreatorAssetType, readonly string[]> = {
  IMAGE: ['image/png', 'image/jpeg', 'image/webp'],
  AUDIO: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
  MODEL: ['model/gltf-binary', 'model/gltf+json', 'application/octet-stream'],
  TEXTURE: ['image/png', 'image/jpeg', 'image/webp'],
  SCRIPT: ['application/json'],
};

const MAX_BYTES_BY_TYPE: Record<V3CreatorAssetType, number> = {
  IMAGE: 8 * 1024 * 1024,
  AUDIO: 20 * 1024 * 1024,
  MODEL: 40 * 1024 * 1024,
  TEXTURE: 12 * 1024 * 1024,
  SCRIPT: 512 * 1024,
};

type PackStatusFilter = V3CreatorPackStatus | 'ALL';

interface AssetDraftState {
  type: V3CreatorAssetType;
  mimeType: string;
  sourceUrl: string;
  checksum: string;
  bytes: number;
  metadataText: string;
}

const defaultAssetDraft: AssetDraftState = {
  type: 'IMAGE',
  mimeType: 'image/png',
  sourceUrl: '',
  checksum: '',
  bytes: 2048,
  metadataText: '',
};

const normalizeErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Creator request failed.';
};

const formatBytes = (bytes: number): string => {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
};

const isValidUrl = (value: string): boolean => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const validateAssetDraft = (draft: AssetDraftState): string[] => {
  const errors: string[] = [];
  const normalizedMimeType = draft.mimeType.trim().toLowerCase();
  const maxBytes = MAX_BYTES_BY_TYPE[draft.type];
  const acceptedMimeTypes = ALLOWED_MIME_TYPES_BY_TYPE[draft.type];

  if (!normalizedMimeType) {
    errors.push('mimeType is required.');
  } else if (!acceptedMimeTypes.includes(normalizedMimeType)) {
    errors.push(`mimeType must match selected type (${acceptedMimeTypes.join(', ')}).`);
  }

  const normalizedSourceUrl = draft.sourceUrl.trim();
  if (!normalizedSourceUrl) {
    errors.push('sourceUrl is required.');
  } else if (!isValidUrl(normalizedSourceUrl)) {
    errors.push('sourceUrl must be a valid URL.');
  }

  const normalizedChecksum = draft.checksum.trim();
  if (!normalizedChecksum) {
    errors.push('checksum is required.');
  } else if (!CHECKSUM_PATTERN.test(normalizedChecksum)) {
    errors.push('checksum must be a 16-128 length hex string.');
  }

  if (!Number.isInteger(draft.bytes) || draft.bytes <= 0) {
    errors.push('bytes must be a positive integer.');
  } else if (draft.bytes > maxBytes) {
    errors.push(`bytes exceed max for ${draft.type} (${formatBytes(maxBytes)}).`);
  }

  if (draft.metadataText.trim()) {
    try {
      const parsed = JSON.parse(draft.metadataText.trim()) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        errors.push('metadata must be a JSON object.');
      }
    } catch {
      errors.push('metadata JSON is invalid.');
    }
  }

  return errors;
};

export function CreatorPage() {
  const [integrationApiKey, setIntegrationApiKey] = useState('');
  const [assetDraft, setAssetDraft] = useState<AssetDraftState>(defaultAssetDraft);
  const [packSlugInput, setPackSlugInput] = useState('');
  const [packTitleInput, setPackTitleInput] = useState('');
  const [packSummaryInput, setPackSummaryInput] = useState('');
  const [packStatusFilter, setPackStatusFilter] = useState<PackStatusFilter>('DRAFT');
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [assets, setAssets] = useState<V3CreatorAssetReadModel[]>([]);
  const [packs, setPacks] = useState<V3CreatorPackReadModel[]>([]);
  const [activePack, setActivePack] = useState<V3CreatorPackReadModel | null>(null);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [loadingPacks, setLoadingPacks] = useState(false);
  const [loadingPackDetail, setLoadingPackDetail] = useState(false);
  const [creatingAsset, setCreatingAsset] = useState(false);
  const [creatingPack, setCreatingPack] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);

  const betaEnabled = useMemo(() => isCreatorBetaEnabled(), []);
  const normalizedApiKey = integrationApiKey.trim();
  const hasApiKey = normalizedApiKey.length > 0;
  const writeInFlight = creatingAsset || creatingPack;
  const previewErrors = useMemo(() => validateAssetDraft(assetDraft), [assetDraft]);
  const acceptedMimeTypes = ALLOWED_MIME_TYPES_BY_TYPE[assetDraft.type];
  const maxBytesForType = MAX_BYTES_BY_TYPE[assetDraft.type];

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const fromStorage = window.localStorage.getItem(CREATOR_KEY_STORAGE);
    const seed = (fromStorage && fromStorage.trim()) || getCreatorIntegrationApiKeySeed() || '';
    if (seed) {
      setIntegrationApiKey(seed);
    }
  }, []);

  const persistApiKey = useCallback((value: string) => {
    if (typeof window === 'undefined') {
      return;
    }

    if (value.trim()) {
      window.localStorage.setItem(CREATOR_KEY_STORAGE, value.trim());
    } else {
      window.localStorage.removeItem(CREATOR_KEY_STORAGE);
    }
  }, []);

  const refreshAssets = useCallback(
    async (apiKey?: string) => {
      const effectiveKey = (apiKey || normalizedApiKey).trim();
      if (!effectiveKey) {
        throw new Error('Integration API key is required before loading assets.');
      }

      const listed = await creatorFeatureApi.listAssets({ limit: 50 }, effectiveKey);
      setAssets(listed.items);
      setSelectedAssetIds((previous) =>
        previous.filter((assetId) => listed.items.some((item) => item.id === assetId))
      );
      return listed.items;
    },
    [normalizedApiKey]
  );

  const refreshPacks = useCallback(
    async (apiKey?: string) => {
      const effectiveKey = (apiKey || normalizedApiKey).trim();
      if (!effectiveKey) {
        throw new Error('Integration API key is required before loading packs.');
      }

      const listed = await creatorFeatureApi.listPacks(
        {
          ...(packStatusFilter === 'ALL' ? {} : { status: packStatusFilter }),
          limit: 30,
        },
        effectiveKey
      );
      setPacks(listed.items);
      return listed.items;
    },
    [normalizedApiKey, packStatusFilter]
  );

  const handleLoadAssets = useCallback(async () => {
    if (!hasApiKey) {
      setRequestError('Integration API key is required.');
      return;
    }

    setRequestError(null);
    setRequestSuccess(null);
    setLoadingAssets(true);
    try {
      await refreshAssets();
    } catch (error) {
      setRequestError(normalizeErrorMessage(error));
    } finally {
      setLoadingAssets(false);
    }
  }, [hasApiKey, refreshAssets]);

  const handleLoadPacks = useCallback(async () => {
    if (!hasApiKey) {
      setRequestError('Integration API key is required.');
      return;
    }

    setRequestError(null);
    setRequestSuccess(null);
    setLoadingPacks(true);
    try {
      await refreshPacks();
    } catch (error) {
      setRequestError(normalizeErrorMessage(error));
    } finally {
      setLoadingPacks(false);
    }
  }, [hasApiKey, refreshPacks]);

  const handleAssetUpload = useCallback(async () => {
    if (!hasApiKey) {
      setRequestError('Integration API key is required.');
      return;
    }

    if (previewErrors.length > 0) {
      setRequestError(previewErrors[0]);
      return;
    }

    let metadata: Record<string, unknown> | undefined;
    if (assetDraft.metadataText.trim()) {
      metadata = JSON.parse(assetDraft.metadataText.trim()) as Record<string, unknown>;
    }

    const payload: V3CreatorCreateAssetPayload = {
      type: assetDraft.type,
      mimeType: assetDraft.mimeType.trim().toLowerCase(),
      sourceUrl: assetDraft.sourceUrl.trim(),
      checksum: assetDraft.checksum.trim().toLowerCase(),
      bytes: assetDraft.bytes,
      ...(metadata ? { metadata } : {}),
    };

    setRequestError(null);
    setRequestSuccess(null);
    setCreatingAsset(true);
    try {
      const created = await creatorFeatureApi.createAsset(payload, normalizedApiKey);
      setAssets((previous) => [created, ...previous.filter((item) => item.id !== created.id)]);
      setSelectedAssetIds((previous) =>
        previous.includes(created.id) ? previous : [...previous, created.id]
      );
      setRequestSuccess(`Asset uploaded: ${created.id}`);
    } catch (error) {
      setRequestError(normalizeErrorMessage(error));
    } finally {
      setCreatingAsset(false);
    }
  }, [assetDraft, hasApiKey, normalizedApiKey, previewErrors]);

  const handleCreatePack = useCallback(async () => {
    if (!hasApiKey) {
      setRequestError('Integration API key is required.');
      return;
    }

    if (!selectedAssetIds.length) {
      setRequestError('Select at least one asset before creating pack draft.');
      return;
    }

    const slug = packSlugInput.trim().toLowerCase();
    const title = packTitleInput.trim();
    const summary = packSummaryInput.trim();

    if (!slug || !title) {
      setRequestError('Pack slug and title are required.');
      return;
    }

    setRequestError(null);
    setRequestSuccess(null);
    setCreatingPack(true);
    try {
      const created = await creatorFeatureApi.createPackDraft(
        {
          slug,
          title,
          ...(summary ? { summary } : {}),
          assetIds: selectedAssetIds,
        },
        normalizedApiKey
      );
      setActivePack(created);
      setPacks((previous) => [created, ...previous.filter((item) => item.id !== created.id)]);
      setRequestSuccess(`Pack drafted: ${created.id}`);
      setPackSlugInput('');
      setPackTitleInput('');
      setPackSummaryInput('');
    } catch (error) {
      setRequestError(normalizeErrorMessage(error));
    } finally {
      setCreatingPack(false);
    }
  }, [hasApiKey, normalizedApiKey, packSlugInput, packSummaryInput, packTitleInput, selectedAssetIds]);

  const handleSelectAsset = useCallback((assetId: string) => {
    setSelectedAssetIds((previous) =>
      previous.includes(assetId)
        ? previous.filter((item) => item !== assetId)
        : [...previous, assetId]
    );
  }, []);

  const handleLoadPackDetail = useCallback(
    async (packId: string) => {
      if (!hasApiKey) {
        setRequestError('Integration API key is required.');
        return;
      }

      setRequestError(null);
      setRequestSuccess(null);
      setLoadingPackDetail(true);
      try {
        const detail = await creatorFeatureApi.getPackById(packId, normalizedApiKey);
        setActivePack(detail);
      } catch (error) {
        setRequestError(normalizeErrorMessage(error));
      } finally {
        setLoadingPackDetail(false);
      }
    },
    [hasApiKey, normalizedApiKey]
  );

  if (!betaEnabled) {
    return (
      <FeatureGateState
        emoji="🧪"
        title="Creator Pipeline 正在灰度"
        description="V3 Creator Alpha is behind beta flag. Enable beta flag to access this page."
        actionLabel="返回首页"
        actionTo="/"
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-100 via-orange-50 to-white p-4">
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">V3 Creator Pipeline Alpha</h1>
          <p className="mt-2 text-sm text-slate-600">
            Security-first alpha: beta-gated entry, integration-key fail-closed, client preview checks
            before upload and pack draft creation.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-[2fr,1fr,1fr]">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Integration API Key</span>
              <input
                type="password"
                value={integrationApiKey}
                onChange={(event) => {
                  setIntegrationApiKey(event.target.value);
                  persistApiKey(event.target.value);
                }}
                placeholder="Paste V3 integration key"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              />
            </label>

            <div className="self-end">
              <button
                type="button"
                onClick={() => void handleLoadAssets()}
                disabled={!hasApiKey || loadingAssets || writeInFlight}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingAssets ? 'Loading Assets...' : 'Load Assets'}
              </button>
            </div>

            <div className="self-end">
              <button
                type="button"
                onClick={() => void handleLoadPacks()}
                disabled={!hasApiKey || loadingPacks || writeInFlight}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingPacks ? 'Loading Packs...' : 'Load Packs'}
              </button>
            </div>
          </div>

          {!hasApiKey ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Integration API key missing. Upload/list/create operations are fail-closed until key is set.
            </p>
          ) : null}

          {requestError ? (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {requestError}
            </p>
          ) : null}

          {requestSuccess ? (
            <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {requestSuccess}
            </p>
          ) : null}
        </section>

        <div className="grid gap-5 xl:grid-cols-[1.1fr,1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Asset Upload</h2>
            <p className="mt-1 text-xs text-slate-500">
              Upload writes are guarded by local preview checks before request submit.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Asset Type
                </span>
                <select
                  data-testid="creator-asset-type"
                  value={assetDraft.type}
                  onChange={(event) =>
                    setAssetDraft((previous) => ({
                      ...previous,
                      type: event.target.value as V3CreatorAssetType,
                    }))
                  }
                  disabled={writeInFlight}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:bg-slate-100"
                >
                  {V3_CREATOR_ASSET_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Mime Type
                </span>
                <input
                  data-testid="creator-asset-mime"
                  value={assetDraft.mimeType}
                  onChange={(event) =>
                    setAssetDraft((previous) => ({
                      ...previous,
                      mimeType: event.target.value,
                    }))
                  }
                  placeholder="image/png"
                  disabled={writeInFlight}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:bg-slate-100"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Source URL
                </span>
                <input
                  data-testid="creator-asset-source"
                  value={assetDraft.sourceUrl}
                  onChange={(event) =>
                    setAssetDraft((previous) => ({
                      ...previous,
                      sourceUrl: event.target.value,
                    }))
                  }
                  placeholder="https://cdn.example.com/assets/frog-kit.png"
                  disabled={writeInFlight}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:bg-slate-100"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Checksum
                </span>
                <input
                  data-testid="creator-asset-checksum"
                  value={assetDraft.checksum}
                  onChange={(event) =>
                    setAssetDraft((previous) => ({
                      ...previous,
                      checksum: event.target.value,
                    }))
                  }
                  placeholder="aabbccddeeff0011..."
                  disabled={writeInFlight}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:bg-slate-100"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Bytes
                </span>
                <input
                  data-testid="creator-asset-bytes"
                  type="number"
                  min={1}
                  step={1}
                  value={assetDraft.bytes}
                  onChange={(event) =>
                    setAssetDraft((previous) => ({
                      ...previous,
                      bytes: Number(event.target.value) || 0,
                    }))
                  }
                  disabled={writeInFlight}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:bg-slate-100"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Metadata JSON (Optional)
                </span>
                <textarea
                  data-testid="creator-asset-metadata"
                  value={assetDraft.metadataText}
                  onChange={(event) =>
                    setAssetDraft((previous) => ({
                      ...previous,
                      metadataText: event.target.value,
                    }))
                  }
                  placeholder='{"theme":"moonlake","rarity":"epic"}'
                  disabled={writeInFlight}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:bg-slate-100"
                />
              </label>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-700">Preview Validator</p>
              <p className="mt-1">
                Accepted mime types for {assetDraft.type}: {acceptedMimeTypes.join(', ')}
              </p>
              <p className="mt-1">
                Max bytes for {assetDraft.type}: {formatBytes(maxBytesForType)} ({maxBytesForType})
              </p>
              {previewErrors.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-red-700">
                  {previewErrors.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-emerald-700">Preview checks passed. Ready to upload.</p>
              )}
            </div>

            <div className="mt-4">
              <button
                data-testid="creator-asset-upload"
                type="button"
                onClick={() => void handleAssetUpload()}
                disabled={!hasApiKey || writeInFlight || previewErrors.length > 0}
                className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {creatingAsset ? 'Uploading...' : 'Upload Asset'}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Pack Draft</h2>
            <p className="mt-1 text-xs text-slate-500">
              Select reviewed assets and create a draft pack for moderation queue handoff.
            </p>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Pack Slug
                </span>
                <input
                  value={packSlugInput}
                  onChange={(event) => setPackSlugInput(event.target.value)}
                  placeholder="moonlake-kit"
                  disabled={writeInFlight}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:bg-slate-100"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Pack Title
                </span>
                <input
                  value={packTitleInput}
                  onChange={(event) => setPackTitleInput(event.target.value)}
                  placeholder="Moonlake Creator Kit"
                  disabled={writeInFlight}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:bg-slate-100"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Summary (Optional)
                </span>
                <textarea
                  value={packSummaryInput}
                  onChange={(event) => setPackSummaryInput(event.target.value)}
                  placeholder="Seasonal world visuals for moonlake narrative."
                  rows={2}
                  disabled={writeInFlight}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:bg-slate-100"
                />
              </label>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Asset Selection ({selectedAssetIds.length})
              </p>
              {assets.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No assets loaded yet.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {assets.map((asset) => (
                    <li key={asset.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                      <label className="flex cursor-pointer items-start gap-2">
                        <input
                          data-testid={`creator-asset-checkbox-${asset.id}`}
                          type="checkbox"
                          checked={selectedAssetIds.includes(asset.id)}
                          onChange={() => handleSelectAsset(asset.id)}
                          disabled={writeInFlight}
                          className="mt-0.5"
                        />
                        <span className="text-xs text-slate-700">
                          <span className="font-semibold">{asset.id}</span> · {asset.type} ·{' '}
                          {asset.mimeType}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={() => void handleCreatePack()}
                disabled={!hasApiKey || writeInFlight || selectedAssetIds.length === 0}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {creatingPack ? 'Creating...' : 'Create Pack Draft'}
              </button>
            </div>
          </section>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr,1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Pack Queue</h2>
              <select
                value={packStatusFilter}
                onChange={(event) => setPackStatusFilter(event.target.value as PackStatusFilter)}
                disabled={loadingPacks || writeInFlight}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
              >
                <option value="ALL">ALL</option>
                {V3_CREATOR_PACK_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            {packs.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No packs loaded.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {packs.map((pack) => (
                  <li key={pack.id}>
                    <button
                      data-testid={`creator-pack-item-${pack.id}`}
                      type="button"
                      onClick={() => void handleLoadPackDetail(pack.id)}
                      disabled={loadingPackDetail}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm transition hover:bg-slate-50 disabled:opacity-60"
                    >
                      <span className="block font-medium text-slate-900">{pack.title}</span>
                      <span className="block text-xs text-slate-500">
                        {pack.id} · {pack.status} · assets {pack.assetCount}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Active Pack Detail</h2>
            {!activePack ? (
              <p className="mt-3 text-sm text-slate-500">Select a pack from queue to inspect detail.</p>
            ) : (
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p>
                  <span className="font-semibold">Pack ID:</span> {activePack.id}
                </p>
                <p>
                  <span className="font-semibold">Slug:</span> {activePack.slug}
                </p>
                <p>
                  <span className="font-semibold">Status:</span> {activePack.status}
                </p>
                <p>
                  <span className="font-semibold">Preview State:</span> {activePack.previewState}
                </p>
                <p>
                  <span className="font-semibold">Asset IDs:</span> {activePack.assetIds.join(', ')}
                </p>
                <p>
                  <span className="font-semibold">Updated:</span> {activePack.updatedAt}
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default CreatorPage;
