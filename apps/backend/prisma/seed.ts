import { prisma } from '../src/lib/prisma.js';
import { seedDemoCore, type DemoSeedSummary } from './seed-data/demoSeedCore.js';
import { getDemoSeedAuthEnvVarName } from './seed-data/demoSeedHelpers.js';

async function seedDemo1(): Promise<void> {
  const summary = await seedDemoCore(prisma);
  printDemoSeedSummary(summary);
}

function printDemoSeedSummary(summary: DemoSeedSummary): void {
  console.log(`${summary.version} seed completed.`);
  console.log('Demo-only users:');

  for (const user of summary.users) {
    console.log(`- ${user.label}: ${user.email} (${user.role})`);
  }

  console.log(`Demo-only password source: ${getDemoSeedAuthEnvVarName()}`);
  console.log('No password hashes printed.');
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
  await seedDemo1();
} catch (error: unknown) {
  if (isExpectedSeedConfigError(error)) {
    console.error('Demo 1 seed failed: ' + error.message);
  } else {
    console.error(error);
  }

  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
