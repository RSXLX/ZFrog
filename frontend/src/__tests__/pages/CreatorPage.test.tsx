import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CreatorPage } from '@/pages/CreatorPage';

const mockCreateAsset = jest.fn();
const mockListAssets = jest.fn();
const mockCreatePackDraft = jest.fn();
const mockListPacks = jest.fn();
const mockGetPackById = jest.fn();

jest.mock('@/features/creator/api', () => ({
  creatorFeatureApi: {
    createAsset: (...args: unknown[]) => mockCreateAsset(...args),
    listAssets: (...args: unknown[]) => mockListAssets(...args),
    createPackDraft: (...args: unknown[]) => mockCreatePackDraft(...args),
    listPacks: (...args: unknown[]) => mockListPacks(...args),
    getPackById: (...args: unknown[]) => mockGetPackById(...args),
  },
}));

const uploadedAsset = {
  id: 'cas_001',
  creatorAppId: 'int_001',
  type: 'IMAGE' as const,
  mimeType: 'image/png',
  sourceUrl: 'https://cdn.example.com/assets/frog-kit.png',
  checksum: 'aabbccddeeff00112233445566778899',
  bytes: 4096,
  status: 'READY' as const,
  metadata: {
    theme: 'moonlake',
  },
  preview: {
    validatorVersion: 'v3-creator-preview-v1',
    acceptedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    maxBytes: 8 * 1024 * 1024,
    checksumAlgorithm: 'sha256' as const,
  },
  createdAt: '2026-03-24T00:00:00.000Z',
  updatedAt: '2026-03-24T00:00:00.000Z',
  audit: {
    createdByKeyId: 'ikey_alpha',
    createdByActor: 'app_alpha:ikey_alpha',
    requestId: null,
  },
};

const draftedPack = {
  id: 'cpk_001',
  creatorAppId: 'int_001',
  slug: 'moonlake-kit',
  title: 'Moonlake Creator Kit',
  summary: 'Seasonal world visuals.',
  status: 'DRAFT' as const,
  previewState: 'READY' as const,
  assetIds: ['cas_001'],
  assetCount: 1,
  createdAt: '2026-03-24T00:05:00.000Z',
  updatedAt: '2026-03-24T00:05:00.000Z',
  audit: {
    createdByKeyId: 'ikey_alpha',
    createdByActor: 'app_alpha:ikey_alpha',
    requestId: null,
  },
};

describe('CreatorPage', () => {
  beforeEach(() => {
    mockCreateAsset.mockReset();
    mockListAssets.mockReset();
    mockCreatePackDraft.mockReset();
    mockListPacks.mockReset();
    mockGetPackById.mockReset();
    (window as any).__ZFROG_V3_CREATOR_BETA__ = undefined;
    window.localStorage.clear();
  });

  const renderPage = () =>
    render(
      <MemoryRouter initialEntries={['/creator']}>
        <Routes>
          <Route path="/creator" element={<CreatorPage />} />
        </Routes>
      </MemoryRouter>
    );

  it('shows beta gate when creator alpha flag is disabled', () => {
    renderPage();
    expect(screen.getByText('Creator Pipeline 正在灰度')).toBeInTheDocument();
  });

  it('fails closed when integration key is missing', () => {
    (window as any).__ZFROG_V3_CREATOR_BETA__ = true;
    renderPage();

    expect(
      screen.getByText(
        'Integration API key missing. Upload/list/create operations are fail-closed until key is set.'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload Asset' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Load Assets' })).toBeDisabled();
  });

  it('uploads asset and creates pack draft', async () => {
    (window as any).__ZFROG_V3_CREATOR_BETA__ = true;
    mockCreateAsset.mockResolvedValue(uploadedAsset);
    mockCreatePackDraft.mockResolvedValue(draftedPack);

    renderPage();

    await userEvent.type(screen.getByPlaceholderText('Paste V3 integration key'), 'test-key');
    await userEvent.clear(screen.getByTestId('creator-asset-source'));
    await userEvent.type(
      screen.getByTestId('creator-asset-source'),
      'https://cdn.example.com/assets/frog-kit.png'
    );
    await userEvent.clear(screen.getByTestId('creator-asset-checksum'));
    await userEvent.type(screen.getByTestId('creator-asset-checksum'), 'aabbccddeeff00112233445566778899');
    await userEvent.clear(screen.getByTestId('creator-asset-bytes'));
    await userEvent.type(screen.getByTestId('creator-asset-bytes'), '4096');
    fireEvent.change(screen.getByTestId('creator-asset-metadata'), {
      target: {
        value: '{"theme":"moonlake"}',
      },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Upload Asset' }));

    await waitFor(() => {
      expect(mockCreateAsset).toHaveBeenCalledWith(
        {
          type: 'IMAGE',
          mimeType: 'image/png',
          sourceUrl: 'https://cdn.example.com/assets/frog-kit.png',
          checksum: 'aabbccddeeff00112233445566778899',
          bytes: 4096,
          metadata: {
            theme: 'moonlake',
          },
        },
        'test-key'
      );
    });

    expect(await screen.findByText('Asset uploaded: cas_001')).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText('moonlake-kit'), 'moonlake-kit');
    await userEvent.type(screen.getByPlaceholderText('Moonlake Creator Kit'), 'Moonlake Creator Kit');
    await userEvent.type(
      screen.getByPlaceholderText('Seasonal world visuals for moonlake narrative.'),
      'Seasonal world visuals.'
    );
    await userEvent.click(screen.getByRole('button', { name: 'Create Pack Draft' }));

    await waitFor(() => {
      expect(mockCreatePackDraft).toHaveBeenCalledWith(
        {
          slug: 'moonlake-kit',
          title: 'Moonlake Creator Kit',
          summary: 'Seasonal world visuals.',
          assetIds: ['cas_001'],
        },
        'test-key'
      );
    });

    expect(await screen.findByText('Pack drafted: cpk_001')).toBeInTheDocument();
    expect(screen.getByText('Pack ID:')).toBeInTheDocument();
    expect(screen.getByText('cpk_001')).toBeInTheDocument();
    expect(screen.getByText('Status:')).toBeInTheDocument();
    expect(screen.getByText('Slug:')).toBeInTheDocument();
  });

  it('shows preview validation error and blocks upload when bytes exceed type max', async () => {
    (window as any).__ZFROG_V3_CREATOR_BETA__ = true;
    renderPage();

    await userEvent.type(screen.getByPlaceholderText('Paste V3 integration key'), 'test-key');
    await userEvent.selectOptions(screen.getByTestId('creator-asset-type'), 'SCRIPT');
    await userEvent.clear(screen.getByTestId('creator-asset-bytes'));
    await userEvent.type(screen.getByTestId('creator-asset-bytes'), '9999999');
    await userEvent.clear(screen.getByTestId('creator-asset-source'));
    await userEvent.type(
      screen.getByTestId('creator-asset-source'),
      'https://cdn.example.com/assets/script.json'
    );
    await userEvent.clear(screen.getByTestId('creator-asset-checksum'));
    await userEvent.type(screen.getByTestId('creator-asset-checksum'), 'aabbccddeeff00112233445566778899');

    expect(screen.getByText(/bytes exceed max for SCRIPT/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload Asset' })).toBeDisabled();
  });
});
