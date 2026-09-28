import { afterEach, describe, expect, it, vi } from 'vitest';

const repositoryMock = vi.hoisted(() => ({
  stopPhishingSimulation: vi.fn(),
  findPhishingSimulationDraftById: vi.fn(),
}));
const scopeMock = vi.hoisted(() => ({ requireOrganisationAdminScope: vi.fn() }));
const deliveryMock = vi.hoisted(() => ({ recoverExpiredEmailDeliveryLeases: vi.fn() }));
const campaignMock = vi.hoisted(() => ({ findCampaignById: vi.fn() }));

vi.mock('../../src/repositories/phishing-simulation.repository.js', () => repositoryMock);
vi.mock('../../src/services/organisation-scope.service.js', () => scopeMock);
vi.mock('../../src/repositories/email-delivery.repository.js', () => deliveryMock);
vi.mock('../../src/repositories/campaign-management.repository.js', () => campaignMock);

const { getPhishingSimulationDraft, stopPhishingSimulation } =
  await import('../../src/services/phishing-simulation.service.js');

const simulation = {
  id: 'simulation-1',
  organisationId: 'organisation-1',
  campaignId: 'campaign-1',
  status: 'RUNNING',
  name: 'Delivery test',
  emailCount: 1,
  startAt: null,
  endAt: null,
  sendFrom: null,
  sendUntil: null,
  weekdays: [],
  providerProfileIds: [],
  pool: [],
  createdAt: new Date('2026-09-25T10:00:00.000Z'),
  updatedAt: new Date('2026-09-25T10:00:00.000Z'),
};

describe('phishing simulation Stop service', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('does not return STOPPED until an active submission has resolved', async () => {
    vi.useFakeTimers();
    scopeMock.requireOrganisationAdminScope.mockResolvedValue(undefined);
    deliveryMock.recoverExpiredEmailDeliveryLeases.mockResolvedValue(undefined);
    repositoryMock.stopPhishingSimulation
      .mockResolvedValueOnce({ state: 'STOPPING', simulation })
      .mockResolvedValueOnce({
        state: 'STOPPED',
        simulation: { ...simulation, status: 'STOPPED' },
      });

    const result = stopPhishingSimulation('user-1', 'organisation-1', 'campaign-1', 'simulation-1');
    await vi.waitFor(() => expect(repositoryMock.stopPhishingSimulation).toHaveBeenCalledTimes(1));
    expect(deliveryMock.recoverExpiredEmailDeliveryLeases).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(250);
    await expect(result).resolves.toMatchObject({ status: 'STOPPED' });
    expect(repositoryMock.stopPhishingSimulation).toHaveBeenCalledTimes(2);
    expect(deliveryMock.recoverExpiredEmailDeliveryLeases).toHaveBeenCalledTimes(1);
  });

  it('combines ordinary and portal requests in message outcomes', async () => {
    scopeMock.requireOrganisationAdminScope.mockResolvedValue({
      grantedPermissions: new Set(['VIEW_CAMPAIGNS']),
    });
    campaignMock.findCampaignById.mockResolvedValue({ id: 'campaign-1' });
    repositoryMock.findPhishingSimulationDraftById.mockResolvedValue({
      ...simulation,
      timezone: 'UTC',
      stopReason: null,
      recipients: [],
      messages: [
        {
          id: 'message-1',
          phishingSimulationId: 'simulation-1',
          recipientId: 'recipient-1',
          poolEmailId: 'email-1',
          providerProfileId: 'provider-1',
          scheduledFor: new Date('2026-09-25T10:00:00.000Z'),
          portalTemplateId: 'GENERIC_ACCOUNT_LOGIN_V1',
          dispatchStatus: 'SUBMITTED',
          emailDeliveryLogId: null,
          actualFromAddress: null,
          actualFromName: null,
          actualReplyTo: null,
          _count: { trackingEvents: 2 },
          managedPortalLink: { _count: { events: 3 } },
        },
      ],
    });

    const result = await getPhishingSimulationDraft(
      'user-1',
      'organisation-1',
      'campaign-1',
      'simulation-1',
    );

    expect(result.messages[0]?.linkRequestCount).toBe(5);
  });
});
