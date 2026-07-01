import { prisma } from '../src/lib/prisma.js';
import { seedDemoCore, type DemoSeedSummary } from './seed-data/demoSeedCore.js';
import { seedAuthBootstrap, type AuthBootstrapSeedSummary } from './seed-data/authBootstrapSeed.js';
import {
  seedOrganisationAdminPermissions,
  type OrganisationPermissionSeedSummary,
} from './seed-data/organisationPermissionSeed.js';

async function seedDemo1(): Promise<void> {
  const summary = await seedDemoCore(prisma);
  printDemoSeedSummary(summary);
}

function printAuthBootstrapSeedSummary(summary: AuthBootstrapSeedSummary): void {
  if (summary.skipped) {
    console.log(`Auth bootstrap skipped: ${summary.reason}`);
    return;
  }

  const action = summary.created ? 'created' : 'updated';
  console.log(`Auth bootstrap ${action} SUPER_ADMIN user: ${summary.email}`);
  console.log('Sensitive credential values are not printed.');
}

function printOrganisationPermissionSeedSummary(summary: OrganisationPermissionSeedSummary): void {
  console.log(
    `Organisation admin permissions seeded for ${summary.organisationCount} organisations: ${summary.permissionCount} permission records, ${summary.initialAdminGrantCount} initial-admin grants.`,
  );
}

function printDemoSeedSummary(summary: DemoSeedSummary): void {
  console.log(`${summary.version} seed completed.`);
  console.log('Demo-only users:');

  for (const user of summary.users) {
    console.log(`- ${user.label}: ${user.email} (${user.role})`);
  }

  console.log('Demo-only credential source environment variable was used.');
  console.log('Sensitive credential values are not printed.');
  console.log('Seeded assigned campaigns:');
  for (const campaign of summary.assignedCampaigns) {
    const lockedItemNote =
      campaign.lockedItemCount > 0 ? `, locked items: ${campaign.lockedItemCount}` : '';
    console.log(
      `- ${campaign.name} (${campaign.id}), assignment: ${campaign.assignmentId}, items: ${campaign.itemCount}${lockedItemNote}, assigned trainee: ${campaign.assignedTraineeEmail}`,
    );
  }
  console.log(
    `Content: ${summary.content.trainingDocumentCount} training documents, ${summary.content.quizCount} quizzes, ${summary.content.quizQuestionCount} questions, ${summary.content.answerOptionCount} answer options, ${summary.content.simulatedEmailCount} simulated emails, ${summary.content.redFlagCount} red flags.`,
  );
}

function isExpectedSeedConfigError(error: unknown): error is Error {
  return (
    error instanceof TypeError && error.message.includes('before running the Demo 1 seed command')
  );
}

try {
  const authBootstrapSummary = await seedAuthBootstrap(prisma);
  printAuthBootstrapSeedSummary(authBootstrapSummary);

  const organisationPermissionSummary = await seedOrganisationAdminPermissions(prisma);
  printOrganisationPermissionSeedSummary(organisationPermissionSummary);

  await seedDemo1();
} catch (error: unknown) {
  if (isExpectedSeedConfigError(error)) {
    console.error('Demo 1 seed failed because a required local seed credential is missing.');
  } else {
    console.error('Seed failed before completion.');
  }

  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
