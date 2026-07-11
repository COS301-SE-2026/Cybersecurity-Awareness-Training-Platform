import { prisma } from '../lib/prisma.js';
export function findInvitationContextTokenByHash(tokenHash: string) {
  return prisma.actionToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          traineeProfile: { include: { organisationTraineeProfile: true } },
          organisationAdminProfile: true,
        },
      },
      invitation: { include: { organisation: true } },
    },
  });
}
