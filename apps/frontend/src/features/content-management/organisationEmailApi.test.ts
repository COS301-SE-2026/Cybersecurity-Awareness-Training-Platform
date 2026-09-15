import type {
  OrganisationEmailDraftInput,
  OrganisationEmailManagementDetailResponse,
} from '@insightful-phish/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../lib/apiClient';
import {
  activateOrganisationEmail,
  copyOrganisationEmail,
  getOrganisationEmail,
  getOrganisationEmails,
  registerOrganisationEmail,
  updateOrganisationEmail,
} from '../../lib/campaignsApi';

const organisationId = '11111111-1111-4111-8111-111111111111';
const emailId = '22222222-2222-4222-8222-222222222222';

const draft: OrganisationEmailDraftInput = {
  senderLabel: 'Security Team',
  senderAddress: 'security@example.test',
  subject: 'Review your access',
  preview: 'A review is pending',
  bodyHtml: '<p>Hello {{FIRST_NAME}}, {{SYSTEM_LINK}}</p>',
  link: { anchorText: 'Review access' },
  expectedClassification: 'PHISHING',
  redFlags: [
    {
      redFlagType: 'LINK',
      label: 'Unexpected link',
      description: 'The link request was unexpected.',
      severity: 'HIGH',
    },
  ],
  categories: ['LINKS_DOMAINS_AND_SENDER_VERIFICATION'],
  difficultyLevel: 'MEDIUM',
};

const detail: OrganisationEmailManagementDetailResponse = {
  id: emailId,
  organisationId,
  createdByUserId: null,
  ...draft,
  status: 'DRAFT',
  createdAt: '2026-09-15T08:00:00.000Z',
  updatedAt: '2026-09-15T08:00:00.000Z',
};

describe('organisation email API', () => {
  afterEach(() => vi.restoreAllMocks());

  it('lists and reads organisation-scoped library emails through shared response schemas', async () => {
    const listResponse = {
      items: [
        {
          id: emailId,
          senderLabel: draft.senderLabel,
          senderAddress: draft.senderAddress,
          subject: draft.subject,
          preview: draft.preview,
          expectedClassification: draft.expectedClassification,
          categories: draft.categories,
          difficultyLevel: draft.difficultyLevel,
          status: 'DRAFT' as const,
          updatedAt: detail.updatedAt,
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };
    const get = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValueOnce(listResponse)
      .mockResolvedValueOnce(detail);

    await expect(
      getOrganisationEmails(organisationId, {
        page: 1,
        limit: 20,
        search: 'security',
        status: 'DRAFT',
      }),
    ).resolves.toEqual(listResponse);
    await expect(getOrganisationEmail(organisationId, emailId)).resolves.toEqual(detail);

    expect(get).toHaveBeenNthCalledWith(
      1,
      `/organisations/${organisationId}/email-library?page=1&limit=20&search=security&status=DRAFT`,
    );
    expect(get).toHaveBeenNthCalledWith(
      2,
      `/organisations/${organisationId}/email-library/${emailId}`,
    );
  });

  it('registers and updates the canonical shared Draft without another request model', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ email: detail, reused: false });
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue(detail);

    await expect(registerOrganisationEmail(organisationId, draft)).resolves.toEqual({
      email: detail,
      reused: false,
    });
    await expect(updateOrganisationEmail(organisationId, emailId, draft)).resolves.toEqual(detail);

    expect(post).toHaveBeenCalledWith(`/organisations/${organisationId}/email-library`, draft);
    expect(patch).toHaveBeenCalledWith(
      `/organisations/${organisationId}/email-library/${emailId}`,
      draft,
    );
  });

  it('activates and copies through explicit empty-body lifecycle requests', async () => {
    const active = { ...detail, status: 'ACTIVE' as const };
    const post = vi
      .spyOn(apiClient, 'post')
      .mockResolvedValueOnce(active)
      .mockResolvedValueOnce(detail);

    await expect(activateOrganisationEmail(organisationId, emailId)).resolves.toEqual(active);
    await expect(copyOrganisationEmail(organisationId, emailId)).resolves.toEqual(detail);

    expect(post).toHaveBeenNthCalledWith(
      1,
      `/organisations/${organisationId}/email-library/${emailId}/activate`,
      {},
    );
    expect(post).toHaveBeenNthCalledWith(
      2,
      `/organisations/${organisationId}/email-library/${emailId}/copy`,
      {},
    );
  });

  it('rejects malformed responses using the canonical shared schemas', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      ...detail,
      contentHash: 'hidden',
      status: 'BROKEN',
    });

    await expect(getOrganisationEmail(organisationId, emailId)).rejects.toMatchObject({
      name: 'ZodError',
    });
  });
});
