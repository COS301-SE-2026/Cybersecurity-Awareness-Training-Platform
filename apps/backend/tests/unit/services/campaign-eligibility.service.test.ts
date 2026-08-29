import { describe, expect, it } from 'vitest';
import {
  CampaignEligibilityService,
  CampaignEligibilityDenialError,
  type SystemClock,
} from '../../../src/services/campaign-eligibility.service.js';

class MockClock implements SystemClock {
  constructor(private currentTime: Date) {}
  now(): Date {
    return this.currentTime;
  }
}

describe('CampaignEligibilityService', () => {
  const baseNow = new Date('2026-06-01T12:00:00Z');
  const clock = new MockClock(baseNow);
  const service = new CampaignEligibilityService(clock);

  it('evaluates active platform campaign with no dates as available', () => {
    const res = service.evaluateCampaignEligibility({
      status: 'ACTIVE',
      campaignType: 'PREMADE_GENERAL',
    });

    expect(res).toEqual({
      canView: true,
      canProgress: true,
      reason: 'AVAILABLE',
    });
  });

  it('evaluates archived campaign as inactive', () => {
    const res = service.evaluateCampaignEligibility({
      status: 'ARCHIVED',
      campaignType: 'ORGANISATION_CUSTOM',
    });

    expect(res).toEqual({
      canView: true,
      canProgress: false,
      reason: 'CAMPAIGN_INACTIVE',
    });
  });

  it('evaluates draft campaign as hidden and inactive', () => {
    const res = service.evaluateCampaignEligibility({
      status: 'DRAFT',
      campaignType: 'ORGANISATION_CUSTOM',
    });

    expect(res).toEqual({
      canView: false,
      canProgress: false,
      reason: 'CAMPAIGN_INACTIVE',
    });
  });

  it('evaluates future-start custom campaign as NOT_STARTED', () => {
    const futureStart = new Date('2026-07-01T00:00:00Z');
    const res = service.evaluateCampaignEligibility({
      status: 'ACTIVE',
      campaignType: 'ORGANISATION_CUSTOM',
      startDate: futureStart,
    });

    expect(res).toEqual({
      canView: true,
      canProgress: false,
      reason: 'NOT_STARTED',
    });
  });

  it('evaluates expired custom campaign as EXPIRED', () => {
    const pastEnd = new Date('2026-05-01T00:00:00Z');
    const res = service.evaluateCampaignEligibility({
      status: 'ACTIVE',
      campaignType: 'ORGANISATION_CUSTOM',
      endDate: pastEnd,
    });

    expect(res).toEqual({
      canView: true,
      canProgress: false,
      reason: 'EXPIRED',
    });
  });

  it('evaluates training document item as readable even when campaign is EXPIRED', () => {
    const itemRes = service.evaluateItemEligibility(
      { canView: true, canProgress: false, reason: 'EXPIRED' },
      'TRAINING_DOCUMENT',
    );

    expect(itemRes).toEqual({
      canView: true,
      canProgress: false,
      reason: 'EXPIRED',
    });
  });

  it('throws typed CAMPAIGN_NOT_STARTED denial error', () => {
    expect(() => {
      service.assertCanProgress({ canView: true, canProgress: false, reason: 'NOT_STARTED' });
    }).toThrowError(CampaignEligibilityDenialError);

    try {
      service.assertCanProgress({ canView: true, canProgress: false, reason: 'NOT_STARTED' });
    } catch (err: unknown) {
      const denial = err as CampaignEligibilityDenialError;
      expect(denial.statusCode).toBe(409);
      expect(denial.errorCode).toBe('CAMPAIGN_NOT_STARTED');
    }
  });

  it('throws typed CAMPAIGN_EXPIRED denial error', () => {
    try {
      service.assertCanProgress({ canView: true, canProgress: false, reason: 'EXPIRED' });
    } catch (err: unknown) {
      const denial = err as CampaignEligibilityDenialError;
      expect(denial.statusCode).toBe(409);
      expect(denial.errorCode).toBe('CAMPAIGN_EXPIRED');
    }
  });

  it('throws typed CAMPAIGN_ARCHIVED denial error', () => {
    try {
      service.assertCanProgress({ canView: true, canProgress: false, reason: 'CAMPAIGN_INACTIVE' });
    } catch (err: unknown) {
      const denial = err as CampaignEligibilityDenialError;
      expect(denial.statusCode).toBe(409);
      expect(denial.errorCode).toBe('CAMPAIGN_ARCHIVED');
    }
  });
});
