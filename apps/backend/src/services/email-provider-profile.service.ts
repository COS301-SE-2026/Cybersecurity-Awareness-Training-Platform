import { randomUUID } from 'node:crypto';
import type {
  CreateEmailProviderProfileRequestDto,
  EmailProviderProfileConnectionCheckResponseDto,
  EmailProviderProfileListResponseDto,
  EmailProviderProfileManagementDetailResponseDto,
  EmailProviderProfileSummaryDto,
  UpdateEmailProviderProfileRequestDto,
} from '@insightful-phish/shared';
import { env } from '../config/env.js';
import * as EmailProviderProfileRepository from '../repositories/email-provider-profile.repository.js';
import {
  createEmailProviderCredential,
  deleteEmailProviderCredential,
  getEmailProviderCredential,
  replaceEmailProviderCredential,
} from './email-provider-secret-store.js';
import { requireOrganisationAdminScope } from './organisation-scope.service.js';
import { verifySmtpConnection } from './smtp-connection-verifier.service.js';

export { OrganisationScopeServiceError } from './organisation-scope.service.js';

type EmailProviderProfileRecord = NonNullable<
  Awaited<ReturnType<typeof EmailProviderProfileRepository.findEmailProviderProfile>>
>;

const IN_USE_SIMULATION_STATUSES = ['SCHEDULED', 'RUNNING'] as const;

export const PLATFORM_EMAIL_PROVIDER_PROFILE_ID = '00000000-0000-4000-8000-000000000000';

export class EmailProviderProfileServiceError extends Error {
  constructor(
    public readonly statusCode: 404 | 409 | 422 | 500 | 503,
    public readonly error: string,
    message: string,
  ) {
    super(message);
    this.name = 'EmailProviderProfileServiceError';
  }
}

function toEmailProviderProfileSummary(
  record: EmailProviderProfileRecord,
  inUse: boolean,
): EmailProviderProfileSummaryDto {
  return {
    id: record.id,
    organisationId: record.organisationId,
    displayName: record.displayName,
    providerKind: 'SMTP',
    status: record.status,
    fromAddress: record.fromAddress,
    fromName: record.fromName,
    replyTo: record.replyTo,
    inUse,
  };
}
function toEmailProviderProfileManagementDetail(
  record: EmailProviderProfileRecord,
  inUse: boolean,
): EmailProviderProfileManagementDetailResponseDto {
  return {
    id: record.id,
    organisationId: record.organisationId,
    displayName: record.displayName,
    providerKind: 'SMTP',
    status: record.status,
    fromAddress: record.fromAddress,
    fromName: record.fromName,
    replyTo: record.replyTo,
    inUse,
    smtpHost: record.smtpHost,
    smtpPort: requireSupportedSmtpPort(record.smtpPort),
    smtpSecure: record.smtpSecure,
    smtpUsername: record.smtpUsername,
  };
}
function toPlatformEmailProviderProfileSummary(inUse: boolean): EmailProviderProfileSummaryDto {
  return {
    id: PLATFORM_EMAIL_PROVIDER_PROFILE_ID,
    organisationId: null,
    displayName: 'Insightful Phish platform sender',
    providerKind: 'SMTP',
    status: 'ACTIVE',
    fromAddress: env.SMTP_FROM_ADDRESS,
    fromName: env.SMTP_FROM_NAME,
    replyTo: null,
    inUse,
  };
}
async function requireReadAccess(actorUserId: string, organisationId: string): Promise<void> {
  await requireOrganisationAdminScope({
    userId: actorUserId,
    organisationId,
    requiredAnyPermission: ['VIEW_CAMPAIGNS', 'MANAGE_CAMPAIGNS'],
  });
}
async function requireManagementAccess(actorUserId: string, organisationId: string): Promise<void> {
  await requireOrganisationAdminScope({
    userId: actorUserId,
    organisationId,
    requiredPermission: 'MANAGE_CAMPAIGNS',
  });
}
function assertOrganisationProfileIsManageable(profileId: string): void {
  if (profileId === PLATFORM_EMAIL_PROVIDER_PROFILE_ID) {
    throw new EmailProviderProfileServiceError(
      409,
      'PLATFORM_EMAIL_PROVIDER_PROFILE_IMMUTABLE',
      'The platform email provider profile cannot be managed',
    );
  }
}
async function requireOrganisationEmailProviderProfile(
  organisationId: string,
  profileId: string,
): Promise<EmailProviderProfileRecord> {
  const profile = await EmailProviderProfileRepository.findEmailProviderProfile(
    organisationId,
    profileId,
  );

  if (profile === null) {
    throw new EmailProviderProfileServiceError(
      404,
      'EMAIL_PROVIDER_PROFILE_NOT_FOUND',
      'Email provider profile not found',
    );
  }

  return profile;
}
async function getInUseEmailProviderProfileIds(organisationId: string): Promise<Set<string>> {
  const references =
    await EmailProviderProfileRepository.findPhishingSimulationProviderProfileReferences({
      organisationId,
      statuses: [...IN_USE_SIMULATION_STATUSES],
    });
  const profileIds = new Set<string>();

  for (const reference of references) {
    for (const profileId of reference.providerProfileIds) {
      profileIds.add(profileId);
    }
  }

  return profileIds;
}
async function isEmailProviderProfileInUse(
  organisationId: string,
  profileId: string,
): Promise<boolean> {
  const references =
    await EmailProviderProfileRepository.findPhishingSimulationProviderProfileReferences({
      organisationId,
      statuses: [...IN_USE_SIMULATION_STATUSES],
      profileId,
    });

  if (references.length > 0) {
    return true;
  }

  return false;
}
function secretStoreUnavailable(): EmailProviderProfileServiceError {
  return new EmailProviderProfileServiceError(
    503,
    'EMAIL_PROVIDER_SECRET_STORE_UNAVAILABLE',
    'Email provider credential storage is unavailable',
  );
}
export async function listEmailProviderProfiles(
  actorUserId: string,
  organisationId: string,
): Promise<EmailProviderProfileListResponseDto> {
  await requireReadAccess(actorUserId, organisationId);
  const [profiles, inUseProfileIds] = await Promise.all([
    EmailProviderProfileRepository.listEmailProviderProfiles(organisationId),
    getInUseEmailProviderProfileIds(organisationId),
  ]);
  const items: EmailProviderProfileSummaryDto[] = [
    toPlatformEmailProviderProfileSummary(inUseProfileIds.has(PLATFORM_EMAIL_PROVIDER_PROFILE_ID)),
  ];

  for (const profile of profiles) {
    items.push(toEmailProviderProfileSummary(profile, inUseProfileIds.has(profile.id)));
  }

  return { items };
}
export async function getEmailProviderProfile(
  actorUserId: string,
  organisationId: string,
  profileId: string,
): Promise<EmailProviderProfileManagementDetailResponseDto> {
  await requireManagementAccess(actorUserId, organisationId);
  assertOrganisationProfileIsManageable(profileId);
  const profile = await requireOrganisationEmailProviderProfile(organisationId, profileId);
  const inUse = await isEmailProviderProfileInUse(organisationId, profileId);
  return toEmailProviderProfileManagementDetail(profile, inUse);
}
export async function createEmailProviderProfile(
  actorUserId: string,
  organisationId: string,
  input: CreateEmailProviderProfileRequestDto,
): Promise<EmailProviderProfileManagementDetailResponseDto> {
  await requireManagementAccess(actorUserId, organisationId);
  const profileId = randomUUID();

  try {
    await createEmailProviderCredential({
      organisationId,
      profileId,
      credential: input.credential,
    });
  } catch {
    throw secretStoreUnavailable();
  }

  let profile: EmailProviderProfileRecord;

  try {
    profile = await EmailProviderProfileRepository.createEmailProviderProfile({
      id: profileId,
      organisationId,
      displayName: input.displayName,
      smtpHost: input.smtpHost,
      smtpPort: input.smtpPort,
      smtpSecure: input.smtpSecure,
      smtpUsername: input.smtpUsername,
      fromAddress: input.fromAddress,
      fromName: input.fromName ?? null,
      replyTo: input.replyTo ?? null,
    });
  } catch {
    try {
      await deleteEmailProviderCredential(organisationId, profileId);
    } catch {
      throw new EmailProviderProfileServiceError(
        503,
        'EMAIL_PROVIDER_PROFILE_CREATE_ROLLBACK_FAILED',
        'Email provider profile creation could not be rolled back safely',
      );
    }

    throw new EmailProviderProfileServiceError(
      500,
      'EMAIL_PROVIDER_PROFILE_CREATE_FAILED',
      'Email provider profile could not be created',
    );
  }

  return toEmailProviderProfileManagementDetail(profile, false);
}
export async function checkEmailProviderProfileConnection(
  actorUserId: string,
  organisationId: string,
  profileId: string,
): Promise<EmailProviderProfileConnectionCheckResponseDto> {
  await requireManagementAccess(actorUserId, organisationId);
  assertOrganisationProfileIsManageable(profileId);
  const profile = await requireOrganisationEmailProviderProfile(organisationId, profileId);
  let credential: string;

  try {
    credential = await getEmailProviderCredential(organisationId, profileId);
  } catch {
    throw secretStoreUnavailable();
  }

  const result = await verifySmtpConnection({
    smtpHost: profile.smtpHost,
    smtpPort: profile.smtpPort,
    smtpSecure: profile.smtpSecure,
    smtpUsername: profile.smtpUsername,
    credential,
  });

  if (result.connected === false) {
    throw new EmailProviderProfileServiceError(
      422,
      result.reasonCode,
      'SMTP connection verification failed',
    );
  }

  return { connected: true };
}
export async function removeEmailProviderProfile(
  actorUserId: string,
  organisationId: string,
  profileId: string,
): Promise<void> {
  await requireManagementAccess(actorUserId, organisationId);
  assertOrganisationProfileIsManageable(profileId);
  await requireOrganisationEmailProviderProfile(organisationId, profileId);
  const inUse = await isEmailProviderProfileInUse(organisationId, profileId);

  if (inUse === true) {
    throw new EmailProviderProfileServiceError(
      409,
      'EMAIL_PROVIDER_PROFILE_IN_USE',
      'Email provider profiles used by Scheduled or Running simulations cannot be changed',
    );
  }

  let credential: string;

  try {
    credential = await getEmailProviderCredential(organisationId, profileId);
    await deleteEmailProviderCredential(organisationId, profileId);
  } catch {
    throw secretStoreUnavailable();
  }

  let deleted: boolean;

  try {
    deleted = await EmailProviderProfileRepository.deleteEmailProviderProfile(
      organisationId,
      profileId,
    );
  } catch {
    try {
      await createEmailProviderCredential({ organisationId, profileId, credential });
    } catch {
      throw new EmailProviderProfileServiceError(
        503,
        'EMAIL_PROVIDER_PROFILE_DELETE_ROLLBACK_FAILED',
        'Email provider profile removal could not be rolled back safely',
      );
    }

    throw new EmailProviderProfileServiceError(
      500,
      'EMAIL_PROVIDER_PROFILE_DELETE_FAILED',
      'Email provider profile could not be removed',
    );
  }

  if (deleted === false) {
    throw new EmailProviderProfileServiceError(
      404,
      'EMAIL_PROVIDER_PROFILE_NOT_FOUND',
      'Email provider profile not found',
    );
  }
}
function hasOperationalProfileChanges(input: UpdateEmailProviderProfileRequestDto): boolean {
  if (
    input.smtpHost !== undefined ||
    input.smtpPort !== undefined ||
    input.smtpSecure !== undefined ||
    input.smtpUsername !== undefined ||
    input.credential !== undefined ||
    input.fromAddress !== undefined ||
    input.fromName !== undefined ||
    input.replyTo !== undefined
  ) {
    return true;
  }

  return false;
}
function hasPersistedProfileChanges(input: UpdateEmailProviderProfileRequestDto): boolean {
  if (
    input.displayName !== undefined ||
    input.status !== undefined ||
    input.smtpHost !== undefined ||
    input.smtpPort !== undefined ||
    input.smtpSecure !== undefined ||
    input.smtpUsername !== undefined ||
    input.fromAddress !== undefined ||
    input.fromName !== undefined ||
    input.replyTo !== undefined
  ) {
    return true;
  }

  return false;
}

async function restorePreviousEmailProviderCredential(
  organisationId: string,
  profileId: string,
  credential: string,
): Promise<void> {
  try {
    await replaceEmailProviderCredential({ organisationId, profileId, credential });
  } catch {
    throw new EmailProviderProfileServiceError(
      503,
      'EMAIL_PROVIDER_PROFILE_UPDATE_ROLLBACK_FAILED',
      'Email provider profile update could not be rolled back safely',
    );
  }
}
export async function updateEmailProviderProfile(
  actorUserId: string,
  organisationId: string,
  profileId: string,
  input: UpdateEmailProviderProfileRequestDto,
): Promise<EmailProviderProfileManagementDetailResponseDto> {
  await requireManagementAccess(actorUserId, organisationId);
  assertOrganisationProfileIsManageable(profileId);
  const currentProfile = await requireOrganisationEmailProviderProfile(organisationId, profileId);
  const inUse = await isEmailProviderProfileInUse(organisationId, profileId);

  if (
    inUse === true &&
    (hasOperationalProfileChanges(input) === true || input.status === 'DISABLED')
  ) {
    throw new EmailProviderProfileServiceError(
      409,
      'EMAIL_PROVIDER_PROFILE_IN_USE',
      'Email provider profiles used by Scheduled or Running simulations cannot be changed',
    );
  }

  let previousCredential: string | undefined;

  if (input.credential !== undefined) {
    try {
      previousCredential = await getEmailProviderCredential(organisationId, profileId);
      await replaceEmailProviderCredential({
        organisationId,
        profileId,
        credential: input.credential,
      });
    } catch {
      throw secretStoreUnavailable();
    }
  }

  if (hasPersistedProfileChanges(input) === false) {
    return toEmailProviderProfileManagementDetail(currentProfile, inUse);
  }

  let updatedProfile: EmailProviderProfileRecord | null;

  try {
    updatedProfile = await EmailProviderProfileRepository.updateEmailProviderProfile({
      organisationId,
      profileId,
      displayName: input.displayName,
      status: input.status,
      smtpHost: input.smtpHost,
      smtpPort: input.smtpPort,
      smtpSecure: input.smtpSecure,
      smtpUsername: input.smtpUsername,
      fromAddress: input.fromAddress,
      fromName: input.fromName,
      replyTo: input.replyTo,
    });
  } catch {
    if (previousCredential !== undefined) {
      await restorePreviousEmailProviderCredential(organisationId, profileId, previousCredential);
    }

    throw new EmailProviderProfileServiceError(
      500,
      'EMAIL_PROVIDER_PROFILE_UPDATE_FAILED',
      'Email provider profile could not be updated',
    );
  }

  if (updatedProfile === null) {
    if (previousCredential !== undefined) {
      await restorePreviousEmailProviderCredential(organisationId, profileId, previousCredential);
    }

    throw new EmailProviderProfileServiceError(
      404,
      'EMAIL_PROVIDER_PROFILE_NOT_FOUND',
      'Email provider profile not found',
    );
  }

  return toEmailProviderProfileManagementDetail(updatedProfile, inUse);
}
export function enableEmailProviderProfile(
  actorUserId: string,
  organisationId: string,
  profileId: string,
): Promise<EmailProviderProfileManagementDetailResponseDto> {
  return updateEmailProviderProfile(actorUserId, organisationId, profileId, { status: 'ACTIVE' });
}
export function disableEmailProviderProfile(
  actorUserId: string,
  organisationId: string,
  profileId: string,
): Promise<EmailProviderProfileManagementDetailResponseDto> {
  return updateEmailProviderProfile(actorUserId, organisationId, profileId, { status: 'DISABLED' });
}
function requireSupportedSmtpPort(
  smtpPort: number,
): EmailProviderProfileManagementDetailResponseDto['smtpPort'] {
  if (smtpPort !== 465 && smtpPort !== 587) {
    throw new EmailProviderProfileServiceError(
      500,
      'EMAIL_PROVIDER_PROFILE_INVALID_SMTP_PORT',
      'Email provider profile contains an unsupported SMTP port',
    );
  }

  return smtpPort;
}
