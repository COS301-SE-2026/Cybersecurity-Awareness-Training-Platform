import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EmailDetailPage from '../EmailDetailPage';
import { getSimulatedEmail } from '../../services/campaigns.service';

const CAMPAIGN_ITEM_ID = 'campaign-item-123';
const EMAIL_ID = 'email-123';
let authToken: string | null = 'demo-token';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useParams: () => ({
      campaignItemId: CAMPAIGN_ITEM_ID,
      emailId: EMAIL_ID,
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
    user: {
      firstName: 'Taylor',
      lastName: 'Nguyen',
      email: 'taylor.nguyen@example.test',
    },
  }),
}));

vi.mock('../../services/campaigns.service', () => ({
  getSimulatedEmail: vi.fn(),
}));

const mockedGetSimulatedEmail = vi.mocked(getSimulatedEmail);

const emailFixture = {
  id: EMAIL_ID,
  campaignItemId: CAMPAIGN_ITEM_ID,
  campaignAssignmentId: 'assignment-1',
  inboxId: 'inbox-1',
  senderLabel: 'Finance Team',
  senderAddress: 'finance@example.com',
  subject: 'payroll access locked',
  preview: 'Review the payroll portal update.',
  bodyHtml:
    '<p>Please <strong>review</strong> your payroll access.</p><script>window.hacked = true;</script><a href="https://example.com">Open portal</a>',
  simulatedLinkTarget: 'https://example.com',
  hasAttachment: false,
  receivedAt: '2026-05-20T10:30:00.000Z',
  difficultyLevel: 'EASY',
} as const;

import { createDeferred } from '../../testing/render';

describe('EmailDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authToken = 'demo-token';
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows a loading state while the simulated email is being fetched', async () => {
    const deferred = createDeferred<typeof emailFixture>();

    mockedGetSimulatedEmail.mockReturnValueOnce(deferred.promise);

    render(<EmailDetailPage />);

    expect(screen.getByText('LOADING EMAIL...')).toBeInTheDocument();

    deferred.resolve(emailFixture);

    expect(await screen.findByText('Finance Team')).toBeInTheDocument();
  });

  it('renders the email details, keeps safe formatting, and sanitizes the body', async () => {
    mockedGetSimulatedEmail.mockResolvedValue(emailFixture);

    render(<EmailDetailPage />);

    expect(await screen.findByText('Finance Team')).toBeInTheDocument();
    expect(screen.getByText('Payroll Access Locked')).toBeInTheDocument();
    expect(screen.getByText('Open portal')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open portal' })).toHaveAttribute(
      'href',
      'https://example.com',
    );
    expect(document.querySelector('.email-body strong')).toHaveTextContent('review');
    expect(document.querySelector('.email-body script')).not.toBeInTheDocument();

    expect(mockedGetSimulatedEmail).toHaveBeenCalledWith(CAMPAIGN_ITEM_ID, EMAIL_ID, 'demo-token');
  });

  it('renders personalisation and the managed-link label without exposing raw markers', async () => {
    mockedGetSimulatedEmail.mockResolvedValue({
      ...emailFixture,
      bodyHtml: '<p>Hello {{FIRST_NAME}} {{SURNAME}} ({{EMAIL_ADDRESS}}). {{SYSTEM_LINK}}</p>',
      linkAnchorText: 'Review account',
      simulatedLinkTarget: null,
    });

    render(<EmailDetailPage />);

    expect(await screen.findByText(/Hello Taylor Nguyen/)).toHaveTextContent(
      'Hello Taylor Nguyen (taylor.nguyen@example.test). Review account',
    );
    expect(screen.queryByText(/{{FIRST_NAME}}|{{SYSTEM_LINK}}/)).not.toBeInTheDocument();
    expect(screen.getByText('Review account')).not.toHaveAttribute('href');
  });

  it('shows an error state when the simulated email cannot be loaded', async () => {
    mockedGetSimulatedEmail.mockRejectedValueOnce(new Error('load failed'));

    render(<EmailDetailPage />);

    expect(await screen.findByText('FAILED TO LOAD EMAIL')).toBeInTheDocument();
  });

  it('strips event-handler attributes and neutralizes javascript links', async () => {
    mockedGetSimulatedEmail.mockResolvedValue(
      createEmailFixture(
        '<p><a href="https://example.com" onclick="alert(1)">Safe link</a></p>' +
          '<p style="position:fixed;inset:0"><a href="javascript:alert(1)" onerror="alert(1)">Unsafe link</a></p>',
      ),
    );

    render(<EmailDetailPage />);

    expect(await screen.findByText('Finance Team')).toBeInTheDocument();

    const safeLink = screen.getByRole('link', { name: 'Safe link' });
    expect(safeLink).toHaveAttribute('href', 'https://example.com');
    expect(safeLink).not.toHaveAttribute('onclick');

    const unsafelink = screen.getByText('Unsafe link').closest('a');
    expect(unsafelink).not.toHaveAttribute('onerror');
    expect(unsafelink?.getAttribute('href') ?? '').not.toMatch(/^javascript:/i);
    expect(screen.getByText('Unsafe link').closest('p')).not.toHaveAttribute('style');
  });

  it('removes iframe and credential-capture form controls from the email body', async () => {
    mockedGetSimulatedEmail.mockResolvedValue(
      createEmailFixture(
        '<p>Review this message carefully.</p>' +
          '<iframe src ="https://evil.example"></iframe>' +
          '<form action="https://evil.example">' +
          '<input name ="username" />' +
          '<input name ="password" type="password" />' +
          '<textarea>secret</textarea>' +
          '<select><option>one</option></select>' +
          '</form>',
      ),
    );

    render(<EmailDetailPage />);

    expect(await screen.findByText('Finance Team')).toBeInTheDocument();
    expect(screen.getByText(/Review this message carefully\./i)).toBeInTheDocument();

    expect(document.querySelector('.email-body iframe')).not.toBeInTheDocument();
    expect(document.querySelector('.email-body form')).not.toBeInTheDocument();
    expect(document.querySelector('.email-body input')).not.toBeInTheDocument();
    expect(document.querySelector('.email-body textarea')).not.toBeInTheDocument();
    expect(document.querySelector('.email-body select')).not.toBeInTheDocument();
    expect(document.querySelector('.email-body button')).not.toBeInTheDocument();
  });
});

function createEmailFixture(bodyHtml: string) {
  return {
    ...emailFixture,
    bodyHtml,
  };
}
