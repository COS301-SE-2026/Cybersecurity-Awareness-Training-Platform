import { afterEach, describe, expect, it, vi } from 'vitest';

const repositoryMock = vi.hoisted(() => ({ stopPhishingSimulation: vi.fn() }));
const scopeMock = vi.hoisted(() => ({ requireOrganisationAdminScope: vi.fn() }));
const deliveryMock = vi.hoisted(() => ({ recoverExpiredEmailDeliveryLeases: vi.fn() }));

vi.mock('../../src/repositories/phishing-simulation.repository.js', () => repositoryMock);
vi.mock('../../src/services/organisation-scope.service.js', () => scopeMock);
vi.mock('../../src/repositories/email-delivery.repository.js', () => deliveryMock);

const { stopPhishingSimulation } =
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
});
