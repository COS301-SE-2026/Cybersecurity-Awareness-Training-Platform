import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import type {
  CampaignCatalogueItemDto,
  CampaignCatalogueQueryDto,
  GetCampaignCatalogueResponseDto,
} from '@insightful-phish/shared';
import { expect, it, vi } from 'vitest';
import { createDeferred, renderWithAuth as render } from '../../testing/render';
import CampaignManagementDetailPage from './CampaignManagementDetailPage';

vi.mock('../../components/layout/AppLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const items: CampaignCatalogueItemDto[] = Array.from({ length: 103 }, (_, index) => ({
  id: `content-${index}`,
  type: 'TRAINING_DOCUMENT',
  title: `Training ${index}`,
  description: `Summary ${index}`,
  contentType: 'MARKDOWN',
  estimatedReadTimeMinutes: 5,
  difficultyLevel: index === 100 ? 'MEDIUM' : index >= 101 ? 'HARD' : 'EASY',
  categories:
    index === 102 ? ['PASSWORDS_AND_AUTHENTICATION'] : ['PHISHING_AND_SUSPICIOUS_MESSAGES'],
  status: 'AVAILABLE',
  organisationId: null,
}));

function catalogue(query: CampaignCatalogueQueryDto): GetCampaignCatalogueResponseDto {
  const eligible = query.search || query.type === 'QUIZ' ? [] : items;
  const totalPages = Math.ceil(eligible.length / query.limit);
  return {
    items: eligible.slice((query.page - 1) * query.limit, query.page * query.limit),
    pagination: {
      page: query.page,
      limit: query.limit,
      totalItems: eligible.length,
      totalPages,
      hasNextPage: query.page < totalPages,
      hasPreviousPage: query.page > 1,
    },
  };
}

function renderPage(
  getCampaignCatalogue: (
    context: unknown,
    query: CampaignCatalogueQueryDto,
  ) => Promise<GetCampaignCatalogueResponseDto>,
  platform = false,
) {
  return render(
    <MemoryRouter
      initialEntries={[platform ? '/platform/campaigns/new' : '/organisations/org/campaigns/new']}
    >
      <Routes>
        <Route
          path={
            platform ? '/platform/campaigns/new' : '/organisations/:organisationId/campaigns/new'
          }
          element={
            <CampaignManagementDetailPage
              contextKind={platform ? 'platform' : 'organisation'}
              client={{
                getCampaignCatalogue,
                getCampaignDetail: vi.fn(),
                createCampaignDraft: vi.fn(),
                updateCampaignDraft: vi.fn(),
              }}
            />
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

it.each([false, true])(
  'selects adaptive alternatives beyond 100 regardless of display filters; platform=%s',
  async (platform) => {
    const getCampaignCatalogue = vi.fn(async (_context, query) => catalogue(query));
    renderPage(getCampaignCatalogue, platform);
    fireEvent.change(screen.getByRole('textbox', { name: 'Campaign name' }), {
      target: { value: 'Keep my draft' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add adaptive item' }));
    const editor = screen.getByRole('region', { name: 'Add adaptive item' });
    const easy = within(editor).getByRole('combobox', { name: /Easy alternative/ });
    const medium = within(editor).getByRole('combobox', { name: /Medium alternative/ });
    const hard = within(editor).getByRole('combobox', { name: /Hard alternative/ });
    await waitFor(() => expect(easy).toBeEnabled());
    fireEvent.change(easy, { target: { value: 'content-0' } });
    fireEvent.change(medium, { target: { value: 'content-100' } });
    fireEvent.change(hard, { target: { value: 'content-101' } });
    expect(within(hard).queryByRole('option', { name: /Training 102/ })).toBeNull();
    expect(getCampaignCatalogue).toHaveBeenCalledWith(
      platform ? { kind: 'platform' } : { kind: 'organisation', organisationId: 'org' },
      { page: 2, limit: 100 },
    );

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search campaign items' }), {
      target: { value: 'no-match' },
    });
    const display = screen.getByRole('region', { name: 'Add items' });
    fireEvent.change(within(display).getByRole('combobox', { name: 'Content type' }), {
      target: { value: 'QUIZ' },
    });
    await screen.findByText('No catalogue items found.');
    expect(easy).toHaveValue('content-0');
    expect(medium).toHaveValue('content-100');
    expect(hard).toHaveValue('content-101');
    expect(screen.getByRole('textbox', { name: 'Campaign name' })).toHaveValue('Keep my draft');
    expect(getCampaignCatalogue.mock.calls.filter(([, query]) => query.limit === 100)).toHaveLength(
      2,
    );
    fireEvent.click(within(editor).getByRole('button', { name: 'Add adaptive item' }));
    expect(screen.getByText('3 items selected')).toBeInTheDocument();
  },
);

it('publishes no partial choices, exposes later-page failure, and retries without resetting edits', async () => {
  const laterPage = createDeferred<GetCampaignCatalogueResponseDto>();
  let failing = true;
  const getCampaignCatalogue = vi.fn(async (_context, query: CampaignCatalogueQueryDto) => {
    if (query.limit === 100 && query.page === 2 && failing) return laterPage.promise;
    return catalogue(query);
  });
  renderPage(getCampaignCatalogue);
  fireEvent.change(screen.getByRole('textbox', { name: 'Campaign name' }), {
    target: { value: 'Unsaved edits' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add adaptive item' }));
  const editor = screen.getByRole('region', { name: 'Add adaptive item' });
  const easy = within(editor).getByRole('combobox', { name: /Easy alternative/ });
  await waitFor(() =>
    expect(getCampaignCatalogue).toHaveBeenCalledWith(expect.anything(), { page: 2, limit: 100 }),
  );
  expect(easy).toBeDisabled();
  expect(within(easy).queryByRole('option', { name: /Training 0/ })).toBeNull();
  await act(async () => laterPage.reject(new Error('Later page unavailable')));
  expect(await within(editor).findByRole('alert')).toHaveTextContent(
    'Eligible Campaign content could not be loaded',
  );
  failing = false;
  fireEvent.click(within(editor).getByRole('button', { name: 'Retry eligible content' }));
  await waitFor(() => expect(easy).toBeEnabled());
  expect(screen.getByRole('textbox', { name: 'Campaign name' })).toHaveValue('Unsaved edits');
});
