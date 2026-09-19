import { prisma } from '../lib/prisma.js';
import type {
  EmailProviderProfileStatus,
  PhishingSimulationStatus,
} from '../generated/prisma/client.js';

export type CreateEmailProviderProfileInput = {
  id: string;
  organisationId: string;
  displayName: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUsername: string;
  fromAddress: string;
  fromName: string | null;
  replyTo: string | null;
};
export type UpdateEmailProviderProfileInput = {
  organisationId: string;
  profileId: string;
  displayName?: string;
  status?: EmailProviderProfileStatus;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUsername?: string;
  fromAddress?: string;
  fromName?: string | null;
  replyTo?: string | null;
};
export type FindPhishingSimulationProviderProfileReferencesInput = {
  organisationId: string;
  statuses: PhishingSimulationStatus[];
  profileId?: string;
};

export function createEmailProviderProfile(input: CreateEmailProviderProfileInput) {
  return prisma.emailProviderProfile.create({
    data: {
      id: input.id,
      organisationId: input.organisationId,
      displayName: input.displayName,
      smtpHost: input.smtpHost,
      smtpPort: input.smtpPort,
      smtpSecure: input.smtpSecure,
      smtpUsername: input.smtpUsername,
      fromAddress: input.fromAddress,
      fromName: input.fromName,
      replyTo: input.replyTo,
    },
  });
}

export function listEmailProviderProfiles(organisationId: string) {
  return prisma.emailProviderProfile.findMany({
    where: { organisationId },
    orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
  });
}

export function findEmailProviderProfile(organisationId: string, profileId: string) {
  return prisma.emailProviderProfile.findFirst({ where: { id: profileId, organisationId } });
}

export function updateEmailProviderProfile(input: UpdateEmailProviderProfileInput) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.emailProviderProfile.updateMany({
      where: { id: input.profileId, organisationId: input.organisationId },
      data: {
        ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.smtpHost !== undefined ? { smtpHost: input.smtpHost } : {}),
        ...(input.smtpPort !== undefined ? { smtpPort: input.smtpPort } : {}),
        ...(input.smtpSecure !== undefined ? { smtpSecure: input.smtpSecure } : {}),
        ...(input.smtpUsername !== undefined ? { smtpUsername: input.smtpUsername } : {}),
        ...(input.fromAddress !== undefined ? { fromAddress: input.fromAddress } : {}),
        ...(input.fromName !== undefined ? { fromName: input.fromName } : {}),
        ...(input.replyTo !== undefined ? { replyTo: input.replyTo } : {}),
      },
    });
    if (updated.count !== 1) return null;
    return tx.emailProviderProfile.findFirst({
      where: { id: input.profileId, organisationId: input.organisationId },
    });
  });
}

export async function deleteEmailProviderProfile(organisationId: string, profileId: string) {
  const deleted = await prisma.emailProviderProfile.deleteMany({
    where: { id: profileId, organisationId },
  });
  return deleted.count === 1;
}

export function findPhishingSimulationProviderProfileReferences(
  input: FindPhishingSimulationProviderProfileReferencesInput,
) {
  return prisma.phishingSimulation.findMany({
    where: {
      organisationId: input.organisationId,
      status: { in: input.statuses },
      ...(input.profileId !== undefined ? { providerProfileIds: { has: input.profileId } } : {}),
    },
    select: { providerProfileIds: true },
  });
}
