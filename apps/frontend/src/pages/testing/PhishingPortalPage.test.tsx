import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  recordPhishingPortalInteraction,
  resolvePhishingPortal,
} from '../../features/phishing-portals/phishingPortalClient';
import { createDeferred } from '../../testing/render';
import PhishingPortalPage from '../PhishingPortalPage';

vi.mock('../../features/phishing-portals/phishingPortalClient', () => ({
  recordPhishingPortalInteraction: vi.fn(),
  resolvePhishingPortal: vi.fn(),
}));

const mockedResolvePhishingPortal = vi.mocked(resolvePhishingPortal);
const mockedRecordPhishingPortalInteraction = vi.mocked(recordPhishingPortalInteraction);

const activeResponse = {
  state: 'ACTIVE',
  portal: {
    templateId: 'GENERIC_ACCOUNT_LOGIN_V1',
    heading: 'Sign in to your account',
    identifierLabel: 'Email address or username',
    credentialLabel: 'Password',
    submitLabel: 'Sign in',
  },
} as const;

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/p/opaque-token']}>
      <Routes>
        <Route path="/p/:token" element={<PhishingPortalPage />} />
        <Route path="/training/:campaignItemId" element={<h1>Training destination</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PhishingPortalPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRecordPhishingPortalInteraction.mockResolvedValue({ accepted: true, reveal: null });
  });

  it('shows loading before rendering an active fixed portal', async () => {
    const request = createDeferred<Awaited<ReturnType<typeof resolvePhishingPortal>>>();
    mockedResolvePhishingPortal.mockReturnValue(request.promise);
    renderPage();

    expect(screen.getByRole('heading', { name: 'Loading portal' })).toBeInTheDocument();

    request.resolve(activeResponse);

    expect(
      await screen.findByRole('heading', { name: 'Sign in to your account' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email address or username')).toBeInTheDocument();
    expect(mockedResolvePhishingPortal).toHaveBeenCalledWith('opaque-token');
  });

  it('records fixed browser stages and shows the returned reveal', async () => {
    const user = userEvent.setup();
    mockedResolvePhishingPortal.mockResolvedValue(activeResponse);
    mockedRecordPhishingPortalInteraction.mockImplementation(async (_token, request) => ({
      accepted: true,
      reveal:
        request.eventType === 'CREDENTIAL_SUBMISSION_ATTEMPTED'
          ? {
              emailRedFlags: [{ label: 'Unexpected request', description: null }],
              portalWarningSigns: [
                { label: 'Unverified destination', description: 'Check the destination first.' },
              ],
              trainingPath: '/training/campaign-item-1',
            }
          : null,
    }));
    renderPage();

    const identifier = await screen.findByLabelText('Email address or username');
    const credential = screen.getByLabelText('Password');
    await user.type(identifier, 'trainee@example.test');
    await user.type(credential, 'local-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByRole('heading', { name: 'This was an authorised phishing simulation' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Unexpected request')).toBeInTheDocument();
    await waitFor(() => {
      expect(
        mockedRecordPhishingPortalInteraction.mock.calls.map((call) => call[1].eventType),
      ).toEqual(
        expect.arrayContaining([
          'PORTAL_VISITED',
          'PORTAL_IDENTIFIER_FIELD_INTERACTED',
          'PORTAL_CREDENTIAL_FIELD_INTERACTED',
          'CREDENTIAL_SUBMISSION_ATTEMPTED',
          'PORTAL_EDUCATIONAL_REVEAL_VIEWED',
        ]),
      );
    });
    expect(JSON.stringify(mockedRecordPhishingPortalInteraction.mock.calls)).not.toContain(
      'trainee@example.test',
    );
    expect(JSON.stringify(mockedRecordPhishingPortalInteraction.mock.calls)).not.toContain(
      'local-password',
    );

    await user.click(screen.getByRole('button', { name: 'Continue to training' }));
    expect(
      await screen.findByRole('heading', { name: 'Training destination' }),
    ).toBeInTheDocument();
  });

  it('retries a failed submission with the same client event identifier', async () => {
    const user = userEvent.setup();
    const submissionIds: string[] = [];
    mockedResolvePhishingPortal.mockResolvedValue(activeResponse);
    mockedRecordPhishingPortalInteraction.mockImplementation(async (_token, request) => {
      if (request.eventType !== 'CREDENTIAL_SUBMISSION_ATTEMPTED') {
        return { accepted: true, reveal: null };
      }

      submissionIds.push(request.clientEventId);
      if (submissionIds.length === 1) {
        throw new Error('temporary failure');
      }

      return { accepted: true, reveal: null };
    });
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Sign in' }));
    expect(
      await screen.findByRole('heading', { name: 'This was an authorised phishing simulation' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(submissionIds).toHaveLength(2));
    expect(submissionIds[0]).toBe(submissionIds[1]);
  });

  it('shows the reveal when submission recording fails twice', async () => {
    const user = userEvent.setup();
    mockedResolvePhishingPortal.mockResolvedValue(activeResponse);
    mockedRecordPhishingPortalInteraction.mockImplementation(async (_token, request) => {
      if (request.eventType === 'CREDENTIAL_SUBMISSION_ATTEMPTED') {
        throw new Error('recording unavailable');
      }

      return { accepted: true, reveal: null };
    });
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Some activity could not be recorded. You can continue safely.',
    );
    expect(
      mockedRecordPhishingPortalInteraction.mock.calls.filter(
        (call) => call[1].eventType === 'CREDENTIAL_SUBMISSION_ATTEMPTED',
      ),
    ).toHaveLength(2);
    expect(
      screen.getByRole('heading', { name: 'This was an authorised phishing simulation' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument();
  });

  it.each([
    ['INACTIVE', 'This simulation link is no longer active'],
    ['UNAVAILABLE', 'Portal unavailable'],
  ] as const)('shows the %s state without an active form', async (state, heading) => {
    mockedResolvePhishingPortal.mockResolvedValue({ state });
    renderPage();

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the generic unavailable state when resolution fails', async () => {
    mockedResolvePhishingPortal.mockRejectedValue(new Error('request failed'));
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Portal unavailable' })).toBeInTheDocument();
    expect(screen.queryByText(/opaque-token/i)).not.toBeInTheDocument();
  });
});
