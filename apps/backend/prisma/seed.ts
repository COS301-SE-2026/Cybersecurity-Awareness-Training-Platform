import { prisma } from '../src/lib/prisma.js';
import { seedDemoCore, type DemoSeedSummary } from './seed-data/demoSeedCore.js';
import { DEMO_SEED_PASSWORD_ENV_VAR } from './seed-data/demoSeedHelpers.js';

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

  console.log(`Demo-only password source: ${DEMO_SEED_PASSWORD_ENV_VAR}`);
  console.log('No password hashes printed.');
  console.log(
    `Campaign: ${summary.campaign.name}, items: ${summary.campaign.itemCount}, assigned trainee: ${summary.campaign.assignedTraineeEmail}`,
  );
  console.log(
    `Content: ${summary.content.trainingDocumentCount} training documents, ${summary.content.quizCount} quizzes, ${summary.content.quizQuestionCount} questions, ${summary.content.answerOptionCount} answer options, ${summary.content.simulatedEmailCount} simulated emails, ${summary.content.redFlagCount} red flags.`,
  );
}

try {
  await seedDemo1();
} catch (error: unknown) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
