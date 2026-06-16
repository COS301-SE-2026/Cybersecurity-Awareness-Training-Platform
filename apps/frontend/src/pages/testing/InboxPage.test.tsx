import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GetSimulatedInboxResponseDto } from '@insightful-phish/shared';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InboxPage from '../InboxPage';
import { getSimulatedInbox } from '../../services/campaigns.service';

const navigateMock = vi.fn();
const CAMPAIGN_ITEM_ID = 'campaign-item-123';
let authToken: string | null = 'demo-token';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({
      campaignItemId: CAMPAIGN_ITEM_ID,
    }),
  };
});

vi.mock('../../components/layout/AppLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../components/ui/PageBackButton', () => ({
  default: () => <div>Back</div>,
}));

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({
    token: authToken,
  }),
}));

vi.mock('../../services/campaigns.service', () => ({
  getSimulatedInbox: vi.fn(),
}));

const mockedGetSimulatedInbox = vi.mocked(getSimulatedInbox);

const inboxFixture: GetSimulatedInboxResponseDto = {
  emails: [
    {
      id: 'email-1',
      inboxId: 'inbox-1',
      senderLabel: 'Finance Team',
      senderAddress: 'finance@example.com',
      subject: 'urgent payroll action',
      preview: 'Verify your account before 5 PM.',
      receivedAt: '2026-05-20T10:30:00.000Z',
      difficultyLevel: 'BEGINNER',
      isOpened: false,
    },
    {
      id: 'email-2',
      inboxId: 'inbox-1',
      senderLabel: 'Human Resources',
      senderAddress: 'hr@example.com',
      subject: 'benefits update',
      preview: 'The annual benefits guide is ready.',
      receivedAt: '2026-05-19T08:00:00.000Z',
      difficultyLevel: 'BEGINNER',
      isOpened: true,
    },
  ],
};

function createDeferred<T>() {
  let resolve: (value: T) => void = () => { };
  let reject: (reason?: unknown) => void = () => { };

  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return {
    promise,
    resolve,
    reject,
  };
}

describe('InboxPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authToken = 'demo-token';
  });

  afterEach(() => {
    cleanup();
  });

  it('shows a loading state while the simulated inbox is being fetched', async () => {
    const deferred = createDeferred<typeof inboxFixture>();

    mockedGetSimulatedInbox.mockReturnValueOnce(deferred.promise);

    render(<InboxPage />);

    expect(screen.getByText('LOADING INBOX...')).toBeInTheDocument();

    deferred.resolve(inboxFixture);

    expect(await screen.findByRole('button', { name: /finance team/i })).toBeInTheDocument();
  });

  it('renders emails, filters results, and navigates to the selected email', async () => {
    const user = userEvent.setup();

    mockedGetSimulatedInbox.mockResolvedValue(inboxFixture);

    render(<InboxPage />);

    expect(
      await screen.findByRole('button', {
        name: /finance team urgent payroll action verify your account before 5 pm\./i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /human resources benefits update/i }),
    ).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/search/i), 'finance');

    expect(screen.getByRole('button', { name: /finance team/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: /human resources benefits update/i,
      }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /finance team/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(
        `/trainee/campaign-items/${CAMPAIGN_ITEM_ID}/simulated-emails/email-1`,
      );
    });
  });

  it('shows an empty state when there are no inbox matches', async () => {
    mockedGetSimulatedInbox.mockResolvedValue({
      emails: [],
    });

    render(<InboxPage />);

    expect(await screen.findByText('NO EMAILS MATCH YOUR SEARCH')).toBeInTheDocument();
  });

  it('shows an error state instead of fetching when auth is missing', async () => {
    authToken = null;

    render(<InboxPage />);

    expect(await screen.findByText('FAILED TO LOAD INBOX')).toBeInTheDocument();
    expect(mockedGetSimulatedInbox).not.toHaveBeenCalled();
  });
});
