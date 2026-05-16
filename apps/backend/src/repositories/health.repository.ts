import { prisma } from '../lib/prisma.js';

export async function checkDatabaseConnection() {
  await prisma.$queryRaw`SELECT 1`;
}
