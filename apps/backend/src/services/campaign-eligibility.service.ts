type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
type CampaignType = 'PREMADE_GENERAL' | 'ORGANISATION_CUSTOM';
type CampaignComponentType = 'SIMULATED_INBOX' | 'TRAINING_DOCUMENT' | 'QUIZ';

export type EligibilityReason =
  | 'AVAILABLE'
  | 'NOT_STARTED'
  | 'EXPIRED'
  | 'CAMPAIGN_INACTIVE'
  | 'COMPLETED';

export type CampaignEligibilityResult = {
  canView: boolean;
  canProgress: boolean;
  reason: EligibilityReason;
};

export type ItemEligibilityResult = {
  canView: boolean;
  canProgress: boolean;
  reason: EligibilityReason;
};

export class CampaignEligibilityDenialError extends Error {
  public readonly status = 409;
  public readonly statusCode = 409;

  constructor(
    public readonly error: 'CAMPAIGN_NOT_STARTED' | 'CAMPAIGN_EXPIRED' | 'CAMPAIGN_ARCHIVED',
    message: string,
  ) {
    super(message);
    this.name = 'CampaignEligibilityDenialError';
  }

  get errorCode(): 'CAMPAIGN_NOT_STARTED' | 'CAMPAIGN_EXPIRED' | 'CAMPAIGN_ARCHIVED' {
    return this.error;
  }
}

export interface SystemClock {
  now(): Date;
}

export class DefaultSystemClock implements SystemClock {
  now(): Date {
    return new Date();
  }
}

export class CampaignEligibilityService {
  constructor(private readonly clock: SystemClock = new DefaultSystemClock()) {}

  evaluateCampaignEligibility(
    campaign: {
      status: CampaignStatus;
      startDate?: Date | null;
      endDate?: Date | null;
      campaignType: CampaignType;
    },
    customNow?: Date,
  ): CampaignEligibilityResult {
    const now = customNow ?? this.clock.now();

    switch (campaign.status) {
      case 'ARCHIVED':
      case 'PAUSED':
        return {
          canView: true,
          canProgress: false,
          reason: 'CAMPAIGN_INACTIVE',
        };
      case 'COMPLETED':
        return {
          canView: true,
          canProgress: false,
          reason: 'COMPLETED',
        };
      case 'ACTIVE': {
        if (campaign.campaignType === 'ORGANISATION_CUSTOM') {
          if (campaign.startDate && now.getTime() < campaign.startDate.getTime()) {
            return {
              canView: true,
              canProgress: false,
              reason: 'NOT_STARTED',
            };
          }

          if (campaign.endDate && now.getTime() >= campaign.endDate.getTime()) {
            return {
              canView: true,
              canProgress: false,
              reason: 'EXPIRED',
            };
          }
        }

        return {
          canView: true,
          canProgress: true,
          reason: 'AVAILABLE',
        };
      }
      case 'DRAFT':
      default:
        return {
          canView: false,
          canProgress: false,
          reason: 'CAMPAIGN_INACTIVE',
        };
    }
  }

  evaluateItemEligibility(
    campaignEligibility: CampaignEligibilityResult,
    componentType?: CampaignComponentType | null,
  ): ItemEligibilityResult {
    if (!campaignEligibility.canView) {
      return {
        canView: false,
        canProgress: false,
        reason: campaignEligibility.reason,
      };
    }

    if (campaignEligibility.reason === 'NOT_STARTED') {
      return {
        canView: false,
        canProgress: false,
        reason: 'NOT_STARTED',
      };
    }

    if (componentType === 'TRAINING_DOCUMENT') {
      return {
        canView: true,
        canProgress: campaignEligibility.canProgress,
        reason: campaignEligibility.reason,
      };
    }

    return {
      canView: campaignEligibility.canView,
      canProgress: campaignEligibility.canProgress,
      reason: campaignEligibility.reason,
    };
  }

  assertCanProgress(eligibility: CampaignEligibilityResult | ItemEligibilityResult): void {
    if (eligibility.canProgress) {
      return;
    }

    if (eligibility.reason === 'NOT_STARTED') {
      throw new CampaignEligibilityDenialError(
        'CAMPAIGN_NOT_STARTED',
        'Campaign has not started yet',
      );
    }

    if (eligibility.reason === 'EXPIRED') {
      throw new CampaignEligibilityDenialError('CAMPAIGN_EXPIRED', 'Campaign has expired');
    }

    throw new CampaignEligibilityDenialError(
      'CAMPAIGN_ARCHIVED',
      'Campaign is archived or inactive',
    );
  }
}

export const defaultCampaignEligibilityService = new CampaignEligibilityService();
