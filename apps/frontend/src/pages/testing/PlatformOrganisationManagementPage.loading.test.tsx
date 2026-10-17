import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import PlatformOrganisationManagementPage from '../PlatformOrganisationManagementPage';
import { AuthContext } from '../../context/auth-context';
import { createAuthContextValue, createDeferred } from '../../testing/render';
import {
  listAllPlatformOrganisationRequests,
  deletePlatformOrganisationRequest,
  type PlatformOrganisationRequestListItemDto,
} from '../../services/platform-organisation-management.service';

vi.mock('../../components/layout/AppLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('../../services/platform-organisation-management.service', async () => ({
  ...(await vi.importActual('../../services/platform-organisation-management.service')),
  listAllPlatformOrganisationRequests: vi.fn(),
  deletePlatformOrganisationRequest: vi.fn(),
}));

function request(index: number): PlatformOrganisationRequestListItemDto {
  return {
    id: `request-${index}`,
    submittedOrganisationName: `Organisation ${index}`,
    submittedWebsite: `https://website-${index}.test`,
    submittedPrimaryDomain: `domain-${index}.test`,
    submittedOrganisationDescription: null,
    submittedOrganisationSize: 20,
    representativeFirstName: 'First',
    representativeLastName: 'Last',
    representativeEmail: `representative-${index}@example.test`,
    representativePhone: null,
    status: index === 100 ? 'APPROVED' : 'PENDING_REVIEW',
    organisationStatus: index === 100 ? 'ACTIVE' : null,
    derivedStatus: index === 100 ? 'ACTIVE' : 'PENDING_REVIEW',
    contactedByIpAdminId: null,
    approvedByIpAdminId: null,
    rejectedByIpAdminId: null,
    approvedOrganisationId: null,
    contactedAt: null,
    approvedAt: null,
    rejectedAt: null,
    rejectionReason: null,
    setupStatus: null,
    resendEligibility: { isEligible: false, reason: null },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}
const rows = Array.from({ length: 101 }, (_, index) => request(index));
const auth = createAuthContextValue();
function page(token = 'token') {
  return (
    <AuthContext.Provider value={{ ...auth, token }}>
      <MemoryRouter>
        <PlatformOrganisationManagementPage />
      </MemoryRouter>
    </AuthContext.Provider>
  );
}
beforeEach(() => vi.resetAllMocks());

it('searches and filters older records across the complete collection', async () => {
  vi.mocked(listAllPlatformOrganisationRequests).mockResolvedValue(rows);
  render(page());
  expect(await screen.findByText('Organisations (101)')).toBeInTheDocument();
  const search = screen.getByPlaceholderText('Search Organisations');
  for (const term of ['domain-100.test', 'website-100.test']) {
    fireEvent.change(search, { target: { value: term } });
    expect(screen.getByText('Organisation 100')).toBeInTheDocument();
    expect(screen.getByText('Organisations (1)')).toBeInTheDocument();
  }
  fireEvent.change(search, { target: { value: '' } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Request status' }), {
    target: { value: 'APPROVED' },
  });
  fireEvent.change(screen.getByRole('combobox', { name: 'Organisation status' }), {
    target: { value: 'ACTIVE' },
  });
  expect(screen.getByText('Organisation 100')).toBeInTheDocument();
  expect(screen.getByText('Organisations (1)')).toBeInTheDocument();
});

it('shows load failure and retries the aggregate collection', async () => {
  vi.mocked(listAllPlatformOrganisationRequests)
    .mockRejectedValueOnce(new Error('Later page failed'))
    .mockResolvedValueOnce(rows);
  render(page());
  fireEvent.click(await screen.findByRole('button', { name: 'Try Again' }));
  expect(await screen.findByText('Organisations (101)')).toBeInTheDocument();
  expect(listAllPlatformOrganisationRequests).toHaveBeenCalledTimes(2);
});

it('reloads the complete collection after deleting a request', async () => {
  const rejected = { ...rows[0], status: 'REJECTED' as const, derivedStatus: 'REJECTED' as const };
  vi.mocked(listAllPlatformOrganisationRequests)
    .mockResolvedValueOnce([rejected, ...rows.slice(1)])
    .mockResolvedValueOnce(rows.slice(1));
  vi.mocked(deletePlatformOrganisationRequest).mockResolvedValue({ success: true });
  render(page());
  const row = (await screen.findByText('Organisation 0')).closest('tr')!;
  fireEvent.click(within(row).getByRole('button', { name: 'Delete Request' }));
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete Request' }),
  );
  await waitFor(() => expect(listAllPlatformOrganisationRequests).toHaveBeenCalledTimes(2));
  expect(await screen.findByText('Organisations (100)')).toBeInTheDocument();
  fireEvent.change(screen.getByPlaceholderText('Search Organisations'), {
    target: { value: 'domain-100.test' },
  });
  expect(screen.getByText('Organisation 100')).toBeInTheDocument();
});

it.each([false, true])(
  'ignores an older authentication load, including stale failure: %s',
  async (fails) => {
    const oldLoad = createDeferred<PlatformOrganisationRequestListItemDto[]>();
    vi.mocked(listAllPlatformOrganisationRequests)
      .mockReturnValueOnce(oldLoad.promise)
      .mockResolvedValueOnce([rows[100]]);
    const { rerender } = render(page('old-token'));
    await waitFor(() =>
      expect(listAllPlatformOrganisationRequests).toHaveBeenCalledWith({}, 'old-token'),
    );
    rerender(page('new-token'));
    expect(await screen.findByText('Organisation 100')).toBeInTheDocument();
    await act(async () => {
      if (fails) oldLoad.reject(new Error('Stale failure'));
      else oldLoad.resolve([rows[0]]);
    });
    expect(screen.getByText('Organisation 100')).toBeInTheDocument();
    expect(screen.queryByText('Organisation 0')).toBeNull();
    expect(screen.queryByText('Failed To Load Organisation Registration Requests')).toBeNull();
  },
);
