import type {
  OrganisationRegistrationRequestStatus,
  OrganisationStatus,
  Prisma,
  PrismaClient,
} from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';

type OrganisationRequestClient = PrismaClient | Prisma.TransactionClient;

const activeRequestStatuses: OrganisationRegistrationRequestStatus[] = [
  'PENDING_REVIEW',
  'CONTACTED',
  'APPROVED',
];

const conflictingOrganisationStatuses: OrganisationStatus[] = ['PENDING_ONBOARDING', 'ACTIVE'];

export type CreateOrganisationRegistrationRequestRecordInput = {
  submittedOrganisationName: string;
  submittedWebsite: string | null;
  submittedOrganisationDescription: string | null;
  submittedOrganisationSize: number;
  submittedPrimaryDomain: string | null;
  representativeFirstName: string;
  representativeLastName: string;
  representativeEmail: string;
};

export function findActiveRequestByOrganisationName(
  organisationName: string,
  client: OrganisationRequestClient = prisma,
) {
  return client.organisationRegistrationRequest.findFirst({
    where: {
      status: {
        in: activeRequestStatuses,
      },
      submittedOrganisationName: {
        equals: organisationName,
        mode: 'insensitive',
      },
    },
  });
}

export function findActiveRequestByWebsiteOrDomain(
  input: { website: string; primaryDomain: string },
  client: OrganisationRequestClient = prisma,
) {
  return client.organisationRegistrationRequest.findFirst({
    where: {
      status: {
        in: activeRequestStatuses,
      },
      OR: [
        {
          submittedWebsite: {
            equals: input.website,
            mode: 'insensitive',
          },
        },
        {
          submittedPrimaryDomain: {
            equals: input.primaryDomain,
            mode: 'insensitive',
          },
        },
      ],
    },
  });
}

export function findActiveRequestByRepresentativeEmail(
  representativeEmail: string,
  client: OrganisationRequestClient = prisma,
) {
  return client.organisationRegistrationRequest.findFirst({
    where: {
      status: {
        in: activeRequestStatuses,
      },
      representativeEmail: {
        equals: representativeEmail,
        mode: 'insensitive',
      },
    },
  });
}

export function findOrganisationByName(
  organisationName: string,
  client: OrganisationRequestClient = prisma,
) {
  return client.organisation.findFirst({
    where: {
      status: {
        in: conflictingOrganisationStatuses,
      },
      name: {
        equals: organisationName,
        mode: 'insensitive',
      },
    },
  });
}

export function createOrganisationRegistrationRequest(
  input: CreateOrganisationRegistrationRequestRecordInput,
  client: OrganisationRequestClient = prisma,
) {
  return client.organisationRegistrationRequest.create({
    data: {
      submittedOrganisationName: input.submittedOrganisationName,
      submittedWebsite: input.submittedWebsite,
      submittedOrganisationDescription: input.submittedOrganisationDescription,
      submittedOrganisationSize: input.submittedOrganisationSize,
      submittedPrimaryDomain: input.submittedPrimaryDomain,
      representativeFirstName: input.representativeFirstName,
      representativeLastName: input.representativeLastName,
      representativeEmail: input.representativeEmail,
      status: 'PENDING_REVIEW',
    },
  });
}
