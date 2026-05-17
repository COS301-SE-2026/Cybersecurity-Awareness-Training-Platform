import { prisma } from '../src/lib/prisma.js';
import { seedDemoCore } from './seed-data/demoSeedCore.js';

async function main(): Promise<void> {
  await seedDemoCore(prisma);
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
