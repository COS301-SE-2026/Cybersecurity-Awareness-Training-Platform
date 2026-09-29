import {
  getPortalTemplateDefinition,
  getPortalTemplatePresentation,
} from '@insightful-phish/shared';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PublicPhishingPortalPage from './PublicPhishingPortalPage';

const activeResponse = {
  state: 'ACTIVE',
  portal: getPortalTemplatePresentation('GENERIC_ACCOUNT_LOGIN_V1'),
};
const revealResponse = {
  accepted: true,
  reveal: {
    emailRedFlags: [{ label: 'Unexpected request', description: 'Check the sender.' }],
    portalWarningSigns: getPortalTemplateDefinition('GENERIC_ACCOUNT_LOGIN_V1').warningSigns,
    trainingPath: null,
  },
};

function renderPortal() {
  return render(
    <MemoryRouter initialEntries={['/p/opaque-token']}>
      <Routes>
        <Route path="/p/:token" element={<PublicPhishingPortalPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('public phishing portal page', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows loading and the fixed portal for an active token', async () => {
    let completeGet: ((response: Response) => void) | undefined;
    fetchMock.mockImplementation((_path, options) => {
      if (options?.method === 'GET') {
        return new Promise<Response>((resolve) => {
          completeGet = resolve;
        });
      }
      return Promise.resolve(Response.json({ accepted: true, reveal: null }));
    });

    renderPortal();
    expect(screen.getByRole('heading', { name: 'Loading portal' })).toBeInTheDocument();
    completeGet?.(
      Response.json({
        state: 'ACTIVE',
        portal: {
          ...activeResponse.portal,
          heading: 'Unexpected server heading',
          identifierLabel: 'Unexpected server label',
        },
      }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Sign in to your account' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email address or username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.queryByText('Unexpected server heading')).not.toBeInTheDocument();
    expect(screen.queryByText('Unexpected server label')).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveClass('phishing-portal--account');
  });

  it.each([
    ['INACTIVE', 'This simulation link is no longer active'],
    ['UNAVAILABLE', 'Portal unavailable'],
  ])('renders a safe %s terminal state', async (state, heading) => {
    fetchMock.mockResolvedValue(Response.json({ state }));

    renderPortal();

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['network failure', () => Promise.reject(new TypeError('Network failed'))],
    ['malformed response', () => Promise.resolve(Response.json({ state: 'ACTIVE' }))],
  ])('fails closed after %s', async (_failure, response) => {
    fetchMock.mockImplementation(response);

    renderPortal();

    expect(await screen.findByRole('heading', { name: 'Portal unavailable' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('shows the reveal when credential-attempt recording fails twice', async () => {
    const submissionIds: string[] = [];
    fetchMock.mockImplementation((_path, options) => {
      if (options?.method === 'GET') return Promise.resolve(Response.json(activeResponse));
      const body = JSON.parse(String(options?.body)) as Record<string, string>;
      if (body.eventType === 'CREDENTIAL_SUBMISSION_ATTEMPTED') {
        submissionIds.push(body.clientEventId);
        return Promise.reject(new TypeError('Network failed'));
      }
      return Promise.resolve(Response.json({ accepted: true, reveal: null }));
    });

    renderPortal();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByRole('heading', { name: 'This was an authorised phishing simulation' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Some activity could not be recorded. You can continue safely.',
    );
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(submissionIds).toHaveLength(2);
    expect(submissionIds[0]).toBe(submissionIds[1]);
  });

  it('sends no entered values, retries one attempted event with the same ID, and shows the returned reveal', async () => {
    let submissionAttempts = 0;
    fetchMock.mockImplementation((_path, options) => {
      if (options?.method === 'GET') return Promise.resolve(Response.json(activeResponse));
      const body = JSON.parse(String(options?.body)) as { eventType: string };
      if (body.eventType === 'CREDENTIAL_SUBMISSION_ATTEMPTED') {
        submissionAttempts += 1;
        if (submissionAttempts === 1) return Promise.reject(new TypeError('Network failed'));
        return Promise.resolve(Response.json(revealResponse));
      }
      return Promise.resolve(Response.json({ accepted: true, reveal: null }));
    });

    renderPortal();
    const user = userEvent.setup();
    await user.type(
      await screen.findByLabelText('Email address or username'),
      'private-identifier',
    );
    await user.type(screen.getByLabelText('Password'), 'private-credential');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByRole('heading', { name: 'This was an authorised phishing simulation' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Unexpected request')).toBeInTheDocument();
    expect(screen.getByText('Check the sender.')).toBeInTheDocument();
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([, options]) =>
          String(options?.body).includes('PORTAL_EDUCATIONAL_REVEAL_VIEWED'),
        ),
      ).toBe(true);
    });

    const requests = fetchMock.mock.calls
      .filter(([, options]) => options?.method === 'POST')
      .map(([, options]) => JSON.parse(String(options?.body)) as Record<string, string>);
    expect(
      requests.every(
        (request) => Object.keys(request).sort().join(',') === 'clientEventId,eventType',
      ),
    ).toBe(true);
    expect(JSON.stringify(requests)).not.toContain('private-identifier');
    expect(JSON.stringify(requests)).not.toContain('private-credential');
    const submissions = requests.filter(
      (request) => request.eventType === 'CREDENTIAL_SUBMISSION_ATTEMPTED',
    );
    expect(submissions).toHaveLength(2);
    expect(submissions[0].clientEventId).toBe(submissions[1].clientEventId);
  });
});
