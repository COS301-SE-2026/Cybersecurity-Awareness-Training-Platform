import { randomUUID } from 'node:crypto';
import type {
  CreateEmailProviderProfileRequestDto,
  EmailProviderProfileConnectionCheckResponseDto,
  EmailProviderProfileListResponseDto,
  EmailProviderProfileManagementDetailResponseDto,
  EmailProviderProfileSummaryDto,
  UpdateEmailProviderProfileRequestDto,
  EmailProviderProfileTestEmailResponseDto,
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
import {
  verifySmtpConnection,
  resolveSafeSmtpHost,
  verifyConfiguredSmtpConnection,
} from './smtp-connection-verifier.service.js';
import {
  SmtpDeliveryError,
  type SmtpSenderConfiguration,
  type SmtpTransportConfiguration,
  sendViaSMTP,
} from './smtp-mailer.js';
import * as UserRepository from '../repositories/user.repository.js';

export { OrganisationScopeServiceError } from './organisation-scope.service.js';

type EmailProviderProfileRecord = NonNullable<
  Awaited<ReturnType<typeof EmailProviderProfileRepository.findEmailProviderProfile>>
>;
export type ResolvedSimulationEmailProvider = {
  transport?: SmtpTransportConfiguration;
  sender: SmtpSenderConfiguration;
};
export type PhishingSimulationAuthoredSender = { senderLabel: string; senderAddress: string };

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
    fromAddress: env.PHISHING_SIMULATION_FROM_ADDRESS,
    fromName: env.PHISHING_SIMULATION_FROM_NAME,
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
  let result: Awaited<ReturnType<typeof verifySmtpConnection>>;

  if (profileId === PLATFORM_EMAIL_PROVIDER_PROFILE_ID) {
    result = await verifyConfiguredSmtpConnection({
      smtpHost: env.SMTP_HOST,
      smtpPort: env.SMTP_PORT,
      smtpSecure: env.SMTP_SECURE,
      smtpUsername: env.SMTP_USER,
      credential: env.SMTP_PASSWORD,
      requireTLS: env.NODE_ENV === 'production' && env.SMTP_SECURE === false,
    });
  } else {
    const profile = await requireOrganisationEmailProviderProfile(organisationId, profileId);
    let credential: string;

    try {
      credential = await getEmailProviderCredential(organisationId, profileId);
    } catch {
      throw secretStoreUnavailable();
    }

    result = await verifySmtpConnection({
      smtpHost: profile.smtpHost,
      smtpPort: profile.smtpPort,
      smtpSecure: profile.smtpSecure,
      smtpUsername: profile.smtpUsername,
      credential,
    });
  }

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
  await reserveOrganisationEmailProviderProfileMutation(organisationId, profileId);

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
  const requiresReservation =
    hasOperationalProfileChanges(input) === true || input.status === 'DISABLED';
  let currentProfile: EmailProviderProfileRecord;
  let inUse: boolean;

  if (requiresReservation === true) {
    currentProfile = await reserveOrganisationEmailProviderProfileMutation(
      organisationId,
      profileId,
    );
    inUse = false;
  } else {
    currentProfile = await requireOrganisationEmailProviderProfile(organisationId, profileId);
    inUse = await isEmailProviderProfileInUse(organisationId, profileId);
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

  const finalStatus =
    requiresReservation === true ? (input.status ?? currentProfile.status) : input.status;
  let updatedProfile: EmailProviderProfileRecord | null;

  try {
    updatedProfile = await EmailProviderProfileRepository.updateEmailProviderProfile({
      organisationId,
      profileId,
      displayName: input.displayName,
      status: finalStatus,
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

async function reserveOrganisationEmailProviderProfileMutation(
  organisationId: string,
  profileId: string,
): Promise<EmailProviderProfileRecord> {
  const result = await EmailProviderProfileRepository.reserveEmailProviderProfileMutation({
    organisationId,
    profileId,
    inUseStatuses: [...IN_USE_SIMULATION_STATUSES],
  });

  if (result.state === 'NOT_FOUND') {
    throw new EmailProviderProfileServiceError(
      404,
      'EMAIL_PROVIDER_PROFILE_NOT_FOUND',
      'Email provider profile not found',
    );
  }

  if (result.state === 'IN_USE') {
    throw new EmailProviderProfileServiceError(
      409,
      'EMAIL_PROVIDER_PROFILE_IN_USE',
      'Email provider profiles used by Scheduled or Running simulations cannot be changed',
    );
  }

  return result.profile;
}

export async function resolvePhishingSimulationEmailProvider(
  organisationId: string,
  providerProfileId: string,
  authoredSender: PhishingSimulationAuthoredSender,
): Promise<ResolvedSimulationEmailProvider> {
  if (providerProfileId === PLATFORM_EMAIL_PROVIDER_PROFILE_ID) {
    return {
      sender: applyAuthoredPhishingSimulationSender(
        {
          fromAddress: env.PHISHING_SIMULATION_FROM_ADDRESS,
          fromName: env.PHISHING_SIMULATION_FROM_NAME,
          replyTo: null,
        },
        authoredSender,
      ),
    };
  }

  const profile = await EmailProviderProfileRepository.findEmailProviderProfile(
    organisationId,
    providerProfileId,
  );
  if (profile === null || profile.status !== 'ACTIVE') {
    throw new SmtpDeliveryError(
      'Email provider profile is unavailable',
      'NON_RETRYABLE',
      'EMAIL_PROVIDER_PROFILE_UNAVAILABLE',
    );
  }
  if (
    (profile.smtpPort !== 465 && profile.smtpPort !== 587) ||
    (profile.smtpPort === 465 && profile.smtpSecure !== true) ||
    (profile.smtpPort === 587 && profile.smtpSecure !== false) ||
    profile.smtpUsername.trim().length === 0
  ) {
    throw new SmtpDeliveryError(
      'Email provider profile is invalid',
      'NON_RETRYABLE',
      'EMAIL_PROVIDER_PROFILE_INVALID',
    );
  }

  let credential: string;
  try {
    credential = await getEmailProviderCredential(organisationId, providerProfileId);
  } catch {
    throw new SmtpDeliveryError(
      'Email provider credential is unavailable',
      'RETRYABLE',
      'EMAIL_PROVIDER_SECRET_STORE_UNAVAILABLE',
    );
  }

  const smtpHostname = profile.smtpHost.trim().toLowerCase();
  const resolution = await resolveSafeSmtpHost(smtpHostname);
  if (resolution.approved === false) {
    const failureKind =
      resolution.reasonCode === 'SMTP_DNS_LOOKUP_FAILED' ? 'RETRYABLE' : 'NON_RETRYABLE';
    throw new SmtpDeliveryError(
      'Email provider SMTP target is unavailable',
      failureKind,
      resolution.reasonCode,
    );
  }

  const transport: SmtpTransportConfiguration = {
    host: resolution.address,
    port: profile.smtpPort,
    secure: profile.smtpSecure,
    requireTLS: profile.smtpPort === 587,
    auth: { user: profile.smtpUsername, pass: credential },
    tls: { servername: smtpHostname, rejectUnauthorized: true, minVersion: 'TLSv1.2' },
  };
  const providerSender: SmtpSenderConfiguration = {
    fromAddress: profile.fromAddress,
    fromName: profile.fromName,
    replyTo: profile.replyTo,
  };
  return {
    transport,
    sender: applyAuthoredPhishingSimulationSender(providerSender, authoredSender),
  };
}
function applyAuthoredPhishingSimulationSender(
  providerSender: SmtpSenderConfiguration,
  authoredSender: PhishingSimulationAuthoredSender,
): SmtpSenderConfiguration {
  const authoredDomain = authoredSender.senderAddress
    .slice(authoredSender.senderAddress.lastIndexOf('@') + 1)
    .toLowerCase();
  const providerDomain = providerSender.fromAddress
    .slice(providerSender.fromAddress.lastIndexOf('@') + 1)
    .toLowerCase();

  return {
    fromAddress:
      authoredDomain === providerDomain ? authoredSender.senderAddress : providerSender.fromAddress,
    fromName: authoredSender.senderLabel,
    replyTo: providerSender.replyTo,
  };
}

export async function sendEmailProviderProfileTest(
  actorUserId: string,
  organisationId: string,
  profileId: string,
): Promise<EmailProviderProfileTestEmailResponseDto> {
  await requireManagementAccess(actorUserId, organisationId);
  const actor = await UserRepository.findUserById(actorUserId);

  if (actor === null) {
    throw new EmailProviderProfileServiceError(404, 'USER_NOT_FOUND', 'User account not found');
  }

  if (profileId === PLATFORM_EMAIL_PROVIDER_PROFILE_ID) {
    const sender: SmtpSenderConfiguration = {
      fromAddress: env.PHISHING_SIMULATION_FROM_ADDRESS,
      fromName: env.PHISHING_SIMULATION_FROM_NAME,
      replyTo: null,
    };
    await sendEmailProviderProfileTestMessage(
      actor.email,
      'Insightful Phish platform sender',
      sender,
    );
    return { sent: true };
  }

  const profile = await requireOrganisationEmailProviderProfile(organisationId, profileId);
  const sender: SmtpSenderConfiguration = {
    fromAddress: profile.fromAddress,
    fromName: profile.fromName,
    replyTo: profile.replyTo,
  };

  if (env.NODE_ENV !== 'production') {
    await sendEmailProviderProfileTestMessage(actor.email, profile.displayName, sender);
    return { sent: true };
  }

  if (
    (profile.smtpPort !== 465 && profile.smtpPort !== 587) ||
    (profile.smtpPort === 465 && profile.smtpSecure !== true) ||
    (profile.smtpPort === 587 && profile.smtpSecure !== false) ||
    profile.smtpUsername.trim().length === 0
  ) {
    throw new EmailProviderProfileServiceError(
      422,
      'EMAIL_PROVIDER_PROFILE_INVALID',
      'Email provider profile is invalid',
    );
  }

  let credential: string;
  try {
    credential = await getEmailProviderCredential(organisationId, profileId);
  } catch {
    throw secretStoreUnavailable();
  }

  const smtpHostname = profile.smtpHost.trim().toLowerCase();
  const resolution = await resolveSafeSmtpHost(smtpHostname);
  if (resolution.approved === false) {
    const statusCode = resolution.reasonCode === 'SMTP_DNS_LOOKUP_FAILED' ? 503 : 422;
    throw new EmailProviderProfileServiceError(
      statusCode,
      resolution.reasonCode,
      'Email provider SMTP target is unavailable',
    );
  }

  const transport: SmtpTransportConfiguration = {
    host: resolution.address,
    port: profile.smtpPort,
    secure: profile.smtpSecure,
    requireTLS: profile.smtpPort === 587,
    auth: { user: profile.smtpUsername, pass: credential },
    tls: { servername: smtpHostname, rejectUnauthorized: true, minVersion: 'TLSv1.2' },
  };
  await sendEmailProviderProfileTestMessage(actor.email, profile.displayName, sender, transport);
  return { sent: true };
}

async function sendEmailProviderProfileTestMessage(
  recipientEmail: string,
  profileDisplayName: string,
  sender: SmtpSenderConfiguration,
  transport?: SmtpTransportConfiguration,
): Promise<void> {
  const text =
    env.NODE_ENV === 'production'
      ? `This test email confirms that the "${profileDisplayName}" SMTP profile can send email through Insightful Phish.`
      : `This development test email was routed through the development mail server for the "${profileDisplayName}" SMTP profile.`;
  try {
    await sendViaSMTP({
      to: recipientEmail,
      subject: 'Insightful Phish SMTP test',
      text,
      transport,
      sender,
    });
  } catch (error) {
    if (error instanceof SmtpDeliveryError) {
      const statusCode = error.failureKind === 'NON_RETRYABLE' ? 422 : 503;
      const message =
        error.failureKind === 'AMBIGUOUS'
          ? 'The SMTP provider did not confirm whether the test email was sent'
          : 'The test email could not be sent';
      throw new EmailProviderProfileServiceError(statusCode, error.reasonCode, message);
    }

    throw error;
  }
}
