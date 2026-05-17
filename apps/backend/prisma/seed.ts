import { prisma } from '../src/lib/prisma.js';
import { DEMO_ONLY_PASSWORD } from './seed-data/demoSeedConfig.js';
import { seedDemoCore, type DemoSeedSummary } from './seed-data/demoSeedCore.js';

async function main(): Promise<void> {
  const summary = await seedDemoCore(prisma);
  printDemoSeedSummary(summary);
}

function printDemoSeedSummary(summary: DemoSeedSummary): void {
  console.log(`${summary.version} seed completed.`);
  console.log('Demo-only users:');

  for (const user of summary.users) {
    console.log(`- ${user.label}: ${user.email} (${user.role})`);
  }

  console.log(`Demo-only password for all listed users: ${DEMO_ONLY_PASSWORD}`);
  console.log('No password hashes printed.');
  console.log(
    `Campaign: ${summary.campaign.name}, items: ${summary.campaign.itemCount}, assigned trainee: ${summary.campaign.assignedTraineeEmail}`,
  );
  console.log(
    `Content: ${summary.content.trainingDocumentCount} training documents, ${summary.content.quizCount} quizzes, ${summary.content.quizQuestionCount} questions, ${summary.content.answerOptionCount} answer options, ${summary.content.simulatedEmailCount} simulated emails, ${summary.content.redFlagCount} red flags.`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
