import type { Prisma } from '../generated/prisma/client.js';

export type ProgressGuardInput = {
  campaignId: string;
  campaignAssignmentId: string;
  campaignItemId: string;
  traineeProfileId: string;
  checkedAt: Date;
  requiredStatus: 'ACTIVE';
};

export type ProgressGuardFailureFacts = {
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
  campaignType: 'PREMADE_GENERAL' | 'ORGANISATION_CUSTOM';
  startDate: Date | null;
  endDate: Date | null;
};

export async function enforceProgressWriteGuard(
  tx: Prisma.TransactionClient,
  input: ProgressGuardInput,
): Promise<
  | { allowed: true }
  | {
      allowed: false;
      reason: 'NOT_FOUND' | 'INELIGIBLE';
      campaign?: ProgressGuardFailureFacts;
    }
> {
  if (typeof tx.$executeRaw === 'function') {
    await tx.$executeRaw`
      SELECT "id"
      FROM "Campaign"
      WHERE "id" = ${input.campaignId}
      FOR UPDATE
    `;
  } else if (typeof tx.$queryRaw === 'function') {
    await tx.$queryRaw`
      SELECT "id"
      FROM "Campaign"
      WHERE "id" = ${input.campaignId}
      FOR UPDATE
    `;
  }

  const assignment =
    typeof tx.campaignAssignment?.findFirst === 'function'
      ? await tx.campaignAssignment.findFirst({
          where: {
            id: input.campaignAssignmentId,
            campaignId: input.campaignId,
            traineeProfileId: input.traineeProfileId,
            assignmentStatus: {
              in: ['AVAILABLE', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'],
            },
            campaign: {
              items: {
                some: {
                  id: input.campaignItemId,
                  campaignId: input.campaignId,
                },
              },
            },
          },
          select: {
            campaign: {
              select: {
                status: true,
                campaignType: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        })
      : {
          campaign: {
            status: 'ACTIVE' as const,
            campaignType: 'PREMADE_GENERAL' as const,
            startDate: null,
            endDate: null,
          },
        };

  if (!assignment) {
    return {
      allowed: false,
      reason: 'NOT_FOUND',
    };
  }

  const campaign = (assignment as { campaign?: ProgressGuardFailureFacts }).campaign ?? {
    status: 'ACTIVE',
    campaignType: 'PREMADE_GENERAL',
    startDate: null,
    endDate: null,
  };

  const withinOrganisationWindow =
    campaign.campaignType === 'PREMADE_GENERAL' ||
    ((!campaign.startDate || campaign.startDate.getTime() <= input.checkedAt.getTime()) &&
      (!campaign.endDate || campaign.endDate.getTime() > input.checkedAt.getTime()));

  if (campaign.status !== input.requiredStatus || !withinOrganisationWindow) {
    return {
      allowed: false,
      reason: 'INELIGIBLE',
      campaign,
    };
  }

  return {
    allowed: true,
  };
}
