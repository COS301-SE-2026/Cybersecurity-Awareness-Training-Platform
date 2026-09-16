import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OrganisationEmailDraftInput, SimulatedInboxDetail } from '@insightful-phish/shared';
import { apiClient } from './apiClient';
import {
  activateSimulatedInbox,
  addAuthoredEmailToSimulatedInbox,
  addLibraryEmailToSimulatedInbox,
  copySimulatedInbox,
  createSimulatedInboxDraft,
  getSimulatedInbox,
  getSimulatedInboxes,
  removeSimulatedInboxEmail,
  reorderSimulatedInboxEmails,
  updateSimulatedInboxDraft,
  updateSimulatedInboxEmail,
} from './campaignsApi';

vi.mock('./apiClient', async () => {
  const actual = await vi.importActual<typeof import('./apiClient')>('./apiClient');
  return {
    ...actual,
    apiClient: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  };
});

const organisationId = '11111111-1111-4111-8111-111111111111';
const simulationId = '22222222-2222-4222-8222-222222222222';
const inboxId = '33333333-3333-4333-8333-333333333333';
const emailId = '44444444-4444-4444-8444-444444444444';
const sourceId = '55555555-5555-4555-8555-555555555555';

const authoredEmail: OrganisationEmailDraftInput = {
  senderLabel: 'Security Team',
  senderAddress: 'security@example.test',
  subject: 'Review access',
  preview: 'A review is pending',
  bodyHtml: '<p>Hello {{FIRST_NAME}}</p>',
  link: null,
  expectedClassification: 'SAFE',
  redFlags: [],
  categories: ['LINKS_DOMAINS_AND_SENDER_VERIFICATION'],
  difficultyLevel: 'EASY',
};

const detail: SimulatedInboxDetail = {
  id: simulationId,
  organisationId,
  createdByUserId: null,
  inboxId,
  title: 'Access review',
  description: 'Identify suspicious messages',
  objective: null,
  difficultyLevel: 'MEDIUM',
  safetyStatus: 'DRAFT',
  lifecycleStatus: 'DRAFT',
  inboxStatus: 'ARCHIVED',
  emails: [
    {
      id: emailId,
      sourceOrganisationEmailId: sourceId,
      position: 0,
      ...authoredEmail,
    },
  ],
  createdAt: '2026-09-15T08:00:00.000Z',
  updatedAt: '2026-09-15T08:00:00.000Z',
};

describe('simulated inbox campaigns API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses every organisation management endpoint and validates responses', async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({
        items: [
          {
            id: detail.id,
            title: detail.title,
            description: detail.description,
            objective: detail.objective,
            difficultyLevel: detail.difficultyLevel,
            safetyStatus: detail.safetyStatus,
            lifecycleStatus: detail.lifecycleStatus,
            emailCount: 1,
            createdAt: detail.createdAt,
            updatedAt: detail.updatedAt,
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      })
      .mockResolvedValueOnce(detail);
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce(detail)
      .mockResolvedValueOnce({
        email: detail.emails[0],
        sourceOrganisationEmailId: sourceId,
        libraryEmailReused: false,
      })
      .mockResolvedValueOnce({
        email: detail.emails[0],
        sourceOrganisationEmailId: sourceId,
        libraryEmailReused: true,
      })
      .mockResolvedValueOnce(detail)
      .mockResolvedValueOnce(detail);
    vi.mocked(apiClient.patch)
      .mockResolvedValueOnce(detail)
      .mockResolvedValueOnce(detail.emails[0]);
    vi.mocked(apiClient.put).mockResolvedValueOnce(detail);
    vi.mocked(apiClient.delete).mockResolvedValueOnce(undefined);

    await getSimulatedInboxes(organisationId, {
      page: 1,
      limit: 20,
      search: 'access',
      lifecycleStatus: 'DRAFT',
    });
    await getSimulatedInbox(organisationId, simulationId);
    await createSimulatedInboxDraft(organisationId, {
      title: 'Access review',
      description: 'Description',
      difficultyLevel: 'MEDIUM',
    });
    await updateSimulatedInboxDraft(organisationId, simulationId, { title: 'Updated' });
    await addAuthoredEmailToSimulatedInbox(organisationId, simulationId, authoredEmail);
    await addLibraryEmailToSimulatedInbox(organisationId, simulationId, {
      organisationEmailId: sourceId,
    });
    await updateSimulatedInboxEmail(organisationId, simulationId, emailId, authoredEmail);
    await reorderSimulatedInboxEmails(organisationId, simulationId, {
      emails: [{ emailId, position: 0 }],
    });
    await removeSimulatedInboxEmail(organisationId, simulationId, emailId);
    await activateSimulatedInbox(organisationId, simulationId);
    await copySimulatedInbox(organisationId, simulationId);

    const root = `/organisations/${organisationId}/simulated-inboxes/${simulationId}`;
    expect(apiClient.get).toHaveBeenNthCalledWith(
      1,
      `/organisations/${organisationId}/simulated-inboxes?page=1&limit=20&search=access&lifecycleStatus=DRAFT`,
    );
    expect(apiClient.get).toHaveBeenNthCalledWith(2, root);
    expect(apiClient.post).toHaveBeenCalledWith(`${root}/emails/authored`, authoredEmail);
    expect(apiClient.post).toHaveBeenCalledWith(`${root}/emails/from-library`, {
      organisationEmailId: sourceId,
    });
    expect(apiClient.patch).toHaveBeenCalledWith(`${root}/emails/${emailId}`, authoredEmail);
    expect(apiClient.put).toHaveBeenCalledWith(`${root}/emails/order`, {
      emails: [{ emailId, position: 0 }],
    });
    expect(apiClient.delete).toHaveBeenCalledWith(`${root}/emails/${emailId}`);
    expect(apiClient.post).toHaveBeenCalledWith(`${root}/activate`, {});
    expect(apiClient.post).toHaveBeenCalledWith(`${root}/copy`, {});
  });

  it('rejects malformed management responses at the client boundary', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ ...detail, lifecycleStatus: 'PUBLISHED' });
    await expect(getSimulatedInbox(organisationId, simulationId)).rejects.toThrow();
  });
});
