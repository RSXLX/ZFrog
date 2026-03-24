import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MemoryWorldPage } from '@/pages/MemoryWorldPage';

const mockCreateWorld = jest.fn();
const mockGetWorldById = jest.fn();
const mockAddContribution = jest.fn();
const mockAddCollaborator = jest.fn();
const mockListTemplates = jest.fn();

jest.mock('@/features/memory-palace-builder/api', () => ({
  memoryWorldFeatureApi: {
    createWorld: (...args: unknown[]) => mockCreateWorld(...args),
    getWorldById: (...args: unknown[]) => mockGetWorldById(...args),
    addContribution: (...args: unknown[]) => mockAddContribution(...args),
    addCollaborator: (...args: unknown[]) => mockAddCollaborator(...args),
    listTemplates: (...args: unknown[]) => mockListTemplates(...args),
  },
}));

const baseWorld = {
  id: 'mpw_001',
  journeyId: 'jrn_story_001',
  title: 'Moonlake Witness Hall',
  summary: 'Shared memory from rescue night.',
  templateSlug: null,
  status: 'ACTIVE' as const,
  ownerAppId: 'int_001',
  createdAt: '2026-03-23T00:00:00.000Z',
  updatedAt: '2026-03-23T00:00:00.000Z',
  collaborators: [
    {
      appId: 'int_001',
      role: 'OWNER' as const,
      addedByActor: 'owner-app:ikey_001',
      createdAt: '2026-03-23T00:00:00.000Z',
    },
  ],
  contributions: [] as Array<{
    id: string;
    appId: string;
    actor: string;
    type: 'WITNESS_NOTE' | 'RELIC_PLACEMENT' | 'PHOTO' | 'MEMORY_FRAGMENT';
    content: string;
    metadata: Record<string, unknown> | null;
    createdAt: string;
  }>,
  metrics: {
    collaboratorCount: 1,
    contributionCount: 0,
  },
};

const worldWithContribution = {
  ...baseWorld,
  contributions: [
    {
      id: 'mpc_001',
      appId: 'int_001',
      actor: 'owner-app:ikey_001',
      type: 'WITNESS_NOTE' as const,
      content: 'Left a witness note near the lantern gate.',
      metadata: null,
      createdAt: '2026-03-23T01:00:00.000Z',
    },
  ],
  metrics: {
    collaboratorCount: 1,
    contributionCount: 1,
  },
};

describe('MemoryWorldPage', () => {
  beforeEach(() => {
    mockCreateWorld.mockReset();
    mockGetWorldById.mockReset();
    mockAddContribution.mockReset();
    mockAddCollaborator.mockReset();
    mockListTemplates.mockReset();
    mockListTemplates.mockResolvedValue({
      total: 0,
      items: [],
    });
    (window as any).__ZFROG_V3_MEMORY_WORLD_BETA__ = undefined;
    (window as any).__ZFROG_V3_MEMORY_WORLD_OWNER__ = undefined;
    window.localStorage.clear();
  });

  const renderPage = (initialPath = '/memory-world') =>
    render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/memory-world" element={<MemoryWorldPage />} />
          <Route path="/memory-world/:worldId" element={<MemoryWorldPage />} />
        </Routes>
      </MemoryRouter>
    );

  it('shows beta gate when memory world alpha flag is disabled', () => {
    renderPage();
    expect(screen.getByText('Memory World Builder 正在灰度')).toBeInTheDocument();
  });

  it('shows owner-only gate when owner entry flag is disabled', () => {
    (window as any).__ZFROG_V3_MEMORY_WORLD_BETA__ = true;
    renderPage();
    expect(screen.getByText('Memory World Builder Owner Alpha')).toBeInTheDocument();
  });

  it('fails closed when integration key is missing', () => {
    (window as any).__ZFROG_V3_MEMORY_WORLD_BETA__ = true;
    (window as any).__ZFROG_V3_MEMORY_WORLD_OWNER__ = true;
    renderPage();

    expect(
      screen.getByText(
        'Integration API key missing. Load/create/contribution actions are fail-closed until key is set.'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create World' })).toBeDisabled();
  });

  it('creates world and submits witness contribution', async () => {
    (window as any).__ZFROG_V3_MEMORY_WORLD_BETA__ = true;
    (window as any).__ZFROG_V3_MEMORY_WORLD_OWNER__ = true;
    mockCreateWorld.mockResolvedValue(baseWorld);
    mockAddContribution.mockResolvedValue(worldWithContribution);
    mockListTemplates.mockResolvedValue({
      total: 1,
      items: [
        {
          id: 'mpt_001',
          slug: 'moonlake-celadon',
          name: 'Moonlake Celadon',
          summary: 'Reviewed template',
          status: 'PUBLISHED',
          featureEnabled: true,
          createdByAppId: 'int_001',
          createdAt: '2026-03-23T00:00:00.000Z',
          updatedAt: '2026-03-23T00:00:00.000Z',
          theme: {
            palette: {
              background: '#ecfeff',
              surface: '#ffffff',
              accent: '#0ea5e9',
              text: '#0f172a',
            },
            badgeLabel: 'Moonlake',
            coverImageUrl: null,
          },
          review: {
            submittedAt: '2026-03-23T00:01:00.000Z',
            reviewedAt: '2026-03-23T00:02:00.000Z',
            reviewedByActor: '0xadmin',
            note: 'approved',
          },
        },
      ],
    });

    renderPage();

    await userEvent.type(screen.getByPlaceholderText('Paste V3 integration key'), 'test-key');
    await waitFor(() => {
      expect(mockListTemplates).toHaveBeenCalledWith('test-key');
    });
    await userEvent.type(screen.getByPlaceholderText('jrn_story_001'), 'jrn_story_001');
    await userEvent.type(screen.getByPlaceholderText('Moonlake Witness Hall'), 'Moonlake Witness Hall');
    await userEvent.selectOptions(screen.getByLabelText('Theme Template'), 'moonlake-celadon');
    await userEvent.click(screen.getByRole('button', { name: 'Create World' }));

    await waitFor(() => {
      expect(mockCreateWorld).toHaveBeenCalledWith(
        {
          journeyId: 'jrn_story_001',
          title: 'Moonlake Witness Hall',
          templateSlug: 'moonlake-celadon',
        },
        'test-key'
      );
    });

    expect(await screen.findByText('Moonlake Witness Hall')).toBeInTheDocument();

    await userEvent.type(
      screen.getByTestId('memory-world-contribution-content'),
      'Left a witness note near the lantern gate.'
    );
    await userEvent.click(screen.getByTestId('memory-world-add-witness'));

    await waitFor(() => {
      expect(mockAddContribution).toHaveBeenCalledWith(
        'mpw_001',
        {
          type: 'WITNESS_NOTE',
          content: 'Left a witness note near the lantern gate.',
        },
        'test-key'
      );
    });

    expect(await screen.findByText('Left a witness note near the lantern gate.')).toBeInTheDocument();
  });
});
