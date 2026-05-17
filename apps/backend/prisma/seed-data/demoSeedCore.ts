import { prisma } from '../../src/lib/prisma.js';
import type { Prisma, PrismaClient } from '../../src/generated/prisma/client.js';
import {
  DEMO_ONLY_PASSWORD,
  DEMO_SEED_CAMPAIGN,
  DEMO_SEED_CAMPAIGN_ASSIGNMENT,
  DEMO_SEED_CAMPAIGN_ITEMS,
  DEMO_SEED_CREDENTIALS,
  DEMO_SEED_IDS,
  DEMO_SEED_TRAINEE_PROFILES,
  DEMO_SEED_USERS,
} from './demoSeedConfig.js';
import { hashDemoPassword } from './demoSeedHelpers.js';

type DemoSeedTransaction = Prisma.TransactionClient;

const DEMO_USER_IDS = Object.values(DEMO_SEED_IDS.users);
const DEMO_USER_EMAILS = Object.values(DEMO_SEED_CREDENTIALS).map(
  (credentials) => credentials.email,
);
const DEMO_TRAINEE_PROFILE_IDS = Object.values(DEMO_SEED_IDS.traineeProfiles);
const DEMO_GENERAL_TRAINEE_PROFILE_IDS = Object.values(DEMO_SEED_IDS.generalTraineeProfiles);
const DEMO_CAMPAIGN_ITEM_IDS = Object.values(DEMO_SEED_IDS.campaignItems);

export async function seedDemoCore(client: PrismaClient = prisma): Promise<void> {
  const passwordHash = await hashDemoPassword(DEMO_ONLY_PASSWORD);

  await client.$transaction(async (tx) => {
    await deleteDemoCore(tx);
    await createDemoCore(tx, passwordHash);
  });
}

async function deleteDemoCore(tx: DemoSeedTransaction): Promise<void> {
  await tx.campaignAssignment.deleteMany({
    where: {
      OR: [
        { id: DEMO_SEED_IDS.campaignAssignments.populatedTrainee },
        { campaignId: DEMO_SEED_IDS.campaign },
        {
          traineeProfileId: {
            in: DEMO_TRAINEE_PROFILE_IDS,
          },
        },
      ],
    },
  });

  await tx.campaignItem.deleteMany({
    where: {
      OR: [{ id: { in: DEMO_CAMPAIGN_ITEM_IDS } }, { campaignId: DEMO_SEED_IDS.campaign }],
    },
  });

  await tx.campaign.deleteMany({
    where: {
      id: DEMO_SEED_IDS.campaign,
    },
  });

  await tx.generalTraineeProfile.deleteMany({
    where: {
      id: {
        in: DEMO_GENERAL_TRAINEE_PROFILE_IDS,
      },
    },
  });

  await tx.traineeProfile.deleteMany({
    where: {
      id: {
        in: DEMO_TRAINEE_PROFILE_IDS,
      },
    },
  });

  await tx.ipAdminProfile.deleteMany({
    where: {
      id: DEMO_SEED_IDS.ipAdminProfile,
    },
  });

  await tx.user.deleteMany({
    where: {
      OR: [
        {
          id: {
            in: DEMO_USER_IDS,
          },
        },
        {
          email: {
            in: DEMO_USER_EMAILS,
          },
        },
      ],
    },
  });
}

async function createDemoCore(tx: DemoSeedTransaction, passwordHash: string): Promise<void> {
  await createDemoUsers(tx, passwordHash);
  await createDemoProfiles(tx);
  await createDemoCampaign(tx);
  await createDemoCampaignItems(tx);
  await createDemoCampaignAssignment(tx);
}

async function createDemoUsers(tx: DemoSeedTransaction, passwordHash: string): Promise<void> {
  for (const user of Object.values(DEMO_SEED_USERS)) {
    await tx.user.create({
      data: {
        ...user,
        passwordHash,
      },
    });
  }
}

async function createDemoProfiles(tx: DemoSeedTransaction): Promise<void> {
  await tx.traineeProfile.create({
    data: {
      id: DEMO_SEED_TRAINEE_PROFILES.populated.id,
      userId: DEMO_SEED_TRAINEE_PROFILES.populated.userId,
      traineeStatus: DEMO_SEED_TRAINEE_PROFILES.populated.traineeStatus,
    },
  });

  await tx.generalTraineeProfile.create({
    data: {
      id: DEMO_SEED_IDS.generalTraineeProfiles.populated,
      traineeProfileId: DEMO_SEED_TRAINEE_PROFILES.populated.id,
      accessSource: DEMO_SEED_TRAINEE_PROFILES.populated.accessSource,
    },
  });

  await tx.traineeProfile.create({
    data: {
      id: DEMO_SEED_TRAINEE_PROFILES.emptyState.id,
      userId: DEMO_SEED_TRAINEE_PROFILES.emptyState.userId,
      traineeStatus: DEMO_SEED_TRAINEE_PROFILES.emptyState.traineeStatus,
    },
  });

  await tx.generalTraineeProfile.create({
    data: {
      id: DEMO_SEED_IDS.generalTraineeProfiles.emptyState,
      traineeProfileId: DEMO_SEED_TRAINEE_PROFILES.emptyState.id,
      accessSource: DEMO_SEED_TRAINEE_PROFILES.emptyState.accessSource,
    },
  });

  await tx.ipAdminProfile.create({
    data: {
      id: DEMO_SEED_IDS.ipAdminProfile,
      userId: DEMO_SEED_IDS.users.admin,
    },
  });
}

async function createDemoCampaign(tx: DemoSeedTransaction): Promise<void> {
  await tx.campaign.create({
    data: DEMO_SEED_CAMPAIGN,
  });
}

async function createDemoCampaignItems(tx: DemoSeedTransaction): Promise<void> {
  for (const item of DEMO_SEED_CAMPAIGN_ITEMS) {
    await tx.campaignItem.create({
      data: {
        id: item.id,
        campaignId: item.campaignId,
        itemType: item.itemType,
        componentType: item.componentType,
        title: item.title,
        description: item.description,
        position: item.position,
        isRequired: item.isRequired,
        availabilityStatus: item.availabilityStatus,
      },
    });
  }
}

async function createDemoCampaignAssignment(tx: DemoSeedTransaction): Promise<void> {
  await tx.campaignAssignment.create({
    data: DEMO_SEED_CAMPAIGN_ASSIGNMENT,
  });
}
