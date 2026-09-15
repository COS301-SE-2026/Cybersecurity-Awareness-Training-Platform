import type {
  OrganisationEmailDraftInput,
  SimulatedInboxChildEmail,
  SimulatedInboxDetail,
} from '@insightful-phish/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../lib/apiClient';
import { renderWithRouter } from '../../testing/render';
import SimulatedInboxManagementPage from './SimulatedInboxManagementPage';

const organisationId = '11111111-1111-4111-8111-111111111111';
const simulationId = '22222222-2222-4222-8222-222222222222';
const copiedSimulationId = '33333333-3333-4333-8333-333333333333';
const sourceId = '44444444-4444-4444-8444-444444444444';
const firstEmailId = '55555555-5555-4555-8555-555555555555';
const secondEmailId = '66666666-6666-4666-8666-666666666666';

const authoredEmail: OrganisationEmailDraftInput = {
  senderLabel: 'Security Team',
  senderAddress: 'security@example.test',
  subject: 'Review access',
  preview: 'A review is pending',
  bodyHtml: '<p>Hello {{FIRST_NAME}}</p>',
  link: null,
  expectedClassification: 'SUSPICIOUS',
  redFlags: [
    { redFlagType: 'REQUEST', label: 'Urgent request', description: null, severity: 'MEDIUM' },
  ],
  categories: ['SOCIAL_ENGINEERING_AND_INFORMATION_DISCLOSURE'],
  difficultyLevel: 'EASY',
};

function child(
  id: string,
  position: number,
  subject = authoredEmail.subject,
): SimulatedInboxChildEmail {
  return { id, position, sourceOrganisationEmailId: sourceId, ...authoredEmail, subject };
}

function inbox(
  emails: SimulatedInboxChildEmail[] = [
    child(firstEmailId, 0),
    child(secondEmailId, 1, 'Payroll update'),
  ],
  lifecycleStatus: 'DRAFT' | 'ACTIVE' = 'DRAFT',
  id = simulationId,
): SimulatedInboxDetail {
  return {
    id,
    organisationId,
    createdByUserId: null,
    inboxId: '77777777-7777-4777-8777-777777777777',
    title: lifecycleStatus === 'ACTIVE' ? 'Active inbox' : 'Inbox Draft title',
    description: 'Practice identifying suspicious requests.',
    objective: null,
    difficultyLevel: 'MEDIUM',
    safetyStatus: lifecycleStatus === 'ACTIVE' ? 'APPROVED' : 'DRAFT',
    lifecycleStatus,
    inboxStatus: lifecycleStatus === 'ACTIVE' ? 'ACTIVE' : 'ARCHIVED',
    emails,
    createdAt: '2026-09-15T08:00:00.000Z',
    updatedAt: '2026-09-15T08:00:00.000Z',
  };
}

function createClient() {
  return {
    list: vi.fn(),
    create: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    addAuthoredEmail: vi.fn(),
    addLibraryEmail: vi.fn(),
    listLibraryEmails: vi.fn(),
    updateEmail: vi.fn(),
    removeEmail: vi.fn(),
    reorderEmails: vi.fn(),
    activate: vi.fn(),
    copy: vi.fn(),
  };
}

function renderDetail(
  client: ReturnType<typeof createClient>,
  entry = `/organisations/${organisationId}/content/simulated-inboxes/${simulationId}`,
  permissions = ['VIEW_CAMPAIGNS', 'MANAGE_CAMPAIGNS'],
) {
  return renderWithRouter(<SimulatedInboxManagementPage client={client} />, {
    initialEntry: entry,
    routePath: '/organisations/:organisationId/content/simulated-inboxes/:simulationId',
    auth: {
      permissions,
      authContext: {
        user: { id: 'admin-id', userType: 'ORGANISATION_ADMIN', authStatus: 'ACTIVE' },
        role: 'ORGANISATION_ADMIN',
        organisation: { id: organisationId, name: 'Example', status: 'ACTIVE' },
        platformAdminRole: null,
        permissions,
        redirectTo: '/organisation-information',
      },
    },
  });
}

describe('SimulatedInboxManagementPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates an empty Draft from the new Inbox route', async () => {
    const user = userEvent.setup();
    const client = createClient();
    client.create.mockResolvedValue(inbox([]));
    renderWithRouter(<SimulatedInboxManagementPage client={client} />, {
      initialEntry: `/organisations/${organisationId}/content/simulated-inboxes/new`,
      routePath: '/organisations/:organisationId/content/simulated-inboxes/new',
      auth: {
        permissions: ['MANAGE_CAMPAIGNS'],
        authContext: {
          user: { id: 'admin-id', userType: 'ORGANISATION_ADMIN', authStatus: 'ACTIVE' },
          role: 'ORGANISATION_ADMIN',
          organisation: { id: organisationId, name: 'Example', status: 'ACTIVE' },
          platformAdminRole: null,
          permissions: ['MANAGE_CAMPAIGNS'],
          redirectTo: '/organisation-information',
        },
      },
    });

    await user.type(screen.getByLabelText('Title'), 'New Inbox');
    await user.type(screen.getByLabelText('Description'), 'New description');
    await user.selectOptions(screen.getByLabelText('Parent difficulty'), 'HARD');
    await user.click(screen.getByRole('button', { name: 'Create Draft' }));

    expect(client.create).toHaveBeenCalledWith(organisationId, {
      title: 'New Inbox',
      description: 'New description',
      difficultyLevel: 'HARD',
    });
  });

  it('protects dirty metadata from browser unload', async () => {
    const user = userEvent.setup();
    const client = createClient();
    renderWithRouter(<SimulatedInboxManagementPage client={client} />, {
      initialEntry: `/organisations/${organisationId}/content/simulated-inboxes/new`,
      routePath: '/organisations/:organisationId/content/simulated-inboxes/new',
      auth: {
        permissions: ['MANAGE_CAMPAIGNS'],
        authContext: {
          user: { id: 'admin-id', userType: 'ORGANISATION_ADMIN', authStatus: 'ACTIVE' },
          role: 'ORGANISATION_ADMIN',
          organisation: { id: organisationId, name: 'Example', status: 'ACTIVE' },
          platformAdminRole: null,
          permissions: ['MANAGE_CAMPAIGNS'],
          redirectTo: '/organisation-information',
        },
      },
    });
    await user.type(screen.getByLabelText('Title'), 'Unsaved');
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('adds authored emails transactionally and retains backend snapshot identities', async () => {
    const user = userEvent.setup();
    const client = createClient();
    const first = child(firstEmailId, 0);
    const second = child(secondEmailId, 1, 'Second authored email');
    client.get
      .mockResolvedValueOnce(inbox([]))
      .mockResolvedValueOnce(inbox([first]))
      .mockResolvedValueOnce(inbox([first, second]));
    client.addAuthoredEmail
      .mockResolvedValueOnce({
        email: first,
        sourceOrganisationEmailId: sourceId,
        libraryEmailReused: false,
      })
      .mockResolvedValueOnce({
        email: second,
        sourceOrganisationEmailId: sourceId,
        libraryEmailReused: true,
      });
    renderDetail(client);

    await screen.findByRole('heading', { name: 'Inbox Draft' });
    await user.click(screen.getByRole('button', { name: 'Add authored email' }));
    await user.click(screen.getByRole('button', { name: 'Add email' }));
    expect(
      await screen.findByText('Email added and registered in the library.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add authored email' }));
    await user.type(screen.getByLabelText('Subject'), 'Second authored email');
    await user.click(screen.getByRole('button', { name: 'Add email' }));

    expect((await screen.findAllByText('Second authored email')).length).toBeGreaterThan(0);
    expect(client.addAuthoredEmail).toHaveBeenCalledTimes(2);
    expect(client.get).toHaveBeenCalledTimes(3);
    expect(screen.getAllByText('Originally copied from library.')).toHaveLength(2);
  });

  it('adds an Active library email as a snapshot and describes the source as traceability only', async () => {
    const user = userEvent.setup();
    const client = createClient();
    const added = child(firstEmailId, 0);
    client.get.mockResolvedValueOnce(inbox([])).mockResolvedValueOnce(inbox([added]));
    client.listLibraryEmails.mockResolvedValue({
      items: [
        {
          id: sourceId,
          senderLabel: authoredEmail.senderLabel,
          senderAddress: authoredEmail.senderAddress,
          subject: authoredEmail.subject,
          preview: authoredEmail.preview,
          expectedClassification: authoredEmail.expectedClassification,
          categories: authoredEmail.categories,
          difficultyLevel: authoredEmail.difficultyLevel,
          status: 'ACTIVE',
          updatedAt: '2026-09-15T08:00:00.000Z',
        },
      ],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });
    client.addLibraryEmail.mockResolvedValue({
      email: added,
      sourceOrganisationEmailId: sourceId,
      libraryEmailReused: true,
    });
    renderDetail(client);

    await screen.findByRole('heading', { name: 'Inbox Draft' });
    await user.click(screen.getByRole('button', { name: 'Browse Email Library' }));
    await user.click(await screen.findByRole('button', { name: 'Add snapshot' }));

    expect(client.addLibraryEmail).toHaveBeenCalledWith(organisationId, simulationId, {
      organisationEmailId: sourceId,
    });
    expect(
      await screen.findByText('A snapshot of the Active library email was added.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Originally copied from library.')).toBeInTheDocument();
    expect(screen.queryByText(/synchron/i)).not.toBeInTheDocument();
  });

  it('edits and reorders snapshots without replacing their IDs', async () => {
    const user = userEvent.setup();
    const client = createClient();
    const original = inbox();
    const edited = child(firstEmailId, 0, 'Edited independently');
    client.get
      .mockResolvedValueOnce(original)
      .mockResolvedValueOnce(inbox([edited, original.emails[1]]));
    client.updateEmail.mockResolvedValue(edited);
    client.reorderEmails.mockResolvedValue(
      inbox([
        child(secondEmailId, 0, 'Payroll update'),
        child(firstEmailId, 1, 'Edited independently'),
      ]),
    );
    renderDetail(client);

    await screen.findByRole('heading', { name: 'Inbox Draft' });
    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    const subject = screen.getByLabelText('Subject');
    await user.clear(subject);
    await user.type(subject, 'Edited independently');
    await user.click(screen.getByRole('button', { name: 'Save email' }));

    expect(
      await screen.findByText('Inbox email saved independently from its library source.'),
    ).toBeInTheDocument();
    expect(client.updateEmail).toHaveBeenCalledWith(
      organisationId,
      simulationId,
      firstEmailId,
      expect.objectContaining({ subject: 'Edited independently' }),
    );

    await user.click(screen.getAllByRole('button', { name: 'Move up' })[1]);
    expect(client.reorderEmails).toHaveBeenCalledWith(organisationId, simulationId, {
      emails: [
        { emailId: secondEmailId, position: 0 },
        { emailId: firstEmailId, position: 1 },
      ],
    });
  });

  it('removes one snapshot through confirmation and re-fetches the authoritative order', async () => {
    const user = userEvent.setup();
    const client = createClient();
    client.get
      .mockResolvedValueOnce(inbox())
      .mockResolvedValueOnce(inbox([child(secondEmailId, 0, 'Payroll update')]));
    client.removeEmail.mockResolvedValue(undefined);
    renderDetail(client);

    await screen.findByRole('heading', { name: 'Inbox Draft' });
    await user.click(screen.getAllByRole('button', { name: 'Remove' })[0]);
    await user.click(
      within(screen.getByRole('dialog', { name: 'Remove email?' })).getByRole('button', {
        name: 'Remove',
      }),
    );

    expect(client.removeEmail).toHaveBeenCalledWith(organisationId, simulationId, firstEmailId);
    expect(await screen.findByText('Email removed from the Inbox Draft.')).toBeInTheDocument();
    expect(screen.queryByText('Review access')).not.toBeInTheDocument();
  });

  it('preserves edited values when save fails', async () => {
    const user = userEvent.setup();
    const client = createClient();
    client.get.mockResolvedValue(inbox());
    client.updateEmail.mockRejectedValue(new Error('offline'));
    renderDetail(client);

    await screen.findByRole('heading', { name: 'Inbox Draft' });
    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    const subject = screen.getByLabelText('Subject');
    await user.clear(subject);
    await user.type(subject, 'Unsaved subject');
    await user.click(screen.getByRole('button', { name: 'Save email' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('could not be saved');
    expect(screen.getByLabelText('Subject')).toHaveValue('Unsaved subject');
  });

  it('shows every activation issue and focuses the first invalid snapshot', async () => {
    const user = userEvent.setup();
    const client = createClient();
    client.get.mockResolvedValue(inbox());
    client.activate.mockRejectedValue(
      new ApiError('Activation failed', {
        status: 422,
        statusText: 'Unprocessable Entity',
        method: 'POST',
        url: '/activate',
        body: {
          message: 'Activation failed',
          details: [
            {
              emailId: secondEmailId,
              position: 1,
              field: 'subject',
              code: 'REQUIRED',
              message: 'Subject is required.',
            },
            {
              emailId: firstEmailId,
              position: 0,
              field: 'senderAddress',
              code: 'INVALID',
              message: 'Sender address is invalid.',
            },
          ],
        },
      }),
    );
    renderDetail(client);

    await screen.findByRole('heading', { name: 'Inbox Draft' });
    await user.click(screen.getByRole('button', { name: 'Activate' }));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Activate simulated inbox?' })).getByRole(
        'button',
        { name: 'Activate' },
      ),
    );

    expect(await screen.findByRole('heading', { name: 'Activation issues' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Email 2: Subject is required.' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Email 1: Sender address is invalid.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Subject is required.')).toBeInTheDocument();
    const focusedCard = screen.getByText('Email 2').closest('article');
    await waitFor(() => expect(focusedCard).toHaveFocus());
  });

  it('keeps Active content read-only and opens the returned editable Draft after copy', async () => {
    const user = userEvent.setup();
    const client = createClient();
    client.get
      .mockResolvedValueOnce(inbox(undefined, 'ACTIVE'))
      .mockResolvedValueOnce(inbox(undefined, 'DRAFT', copiedSimulationId));
    client.copy.mockResolvedValue(inbox(undefined, 'DRAFT', copiedSimulationId));
    renderDetail(client);

    await screen.findByRole('heading', { name: 'Active Simulated Inbox' });
    expect(screen.getByLabelText('Title')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Move up' })).not.toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'View details' })[0]);
    expect(screen.getByLabelText('Subject')).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await user.click(screen.getByRole('button', { name: 'Copy to new Draft' }));

    expect(client.copy).toHaveBeenCalledWith(organisationId, simulationId);
    expect(await screen.findByRole('heading', { name: 'Inbox Draft' })).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toBeEnabled();
  });
});
