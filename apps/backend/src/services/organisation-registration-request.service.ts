import type {
  CreateOrganisationRegistrationRequestDto,
  OrganisationRegistrationRequestResponseDto,
} from '@insightful-phish/shared';
import * as OrganisationRequestRepository from '../repositories/organisation-registration-request.repository.js';
import * as UserRepository from '../repositories/user.repository.js';
import { recordAuditLog } from './audit-log.service.js';
import { requestAuthEmailSend } from './auth-email-hook.service.js';

export class OrganisationRegistrationRequestError extends Error {
  constructor(
    public readonly statusCode: 409,
    public readonly error: string,
    message: string,
  ) {
    super(message);
    this.name = 'OrganisationRegistrationRequestError';
  }
}

export async function createOrganisationRegistrationRequest(
  input: CreateOrganisationRegistrationRequestDto,
): Promise<OrganisationRegistrationRequestResponseDto> {
  const normalisedWebsite = normaliseWebsiteUrl(input.organisationWebsiteUrl);
  const primaryDomain = primaryDomainFromWebsite(normalisedWebsite);

  await assertNoDuplicateOrganisationRequest({
    organisationName: input.organisationName,
    website: normalisedWebsite,
    primaryDomain,
    representativeEmail: input.representativeEmail,
  });
  await assertNoRepresentativeRoleConflict(input.representativeEmail);

  const request = await OrganisationRequestRepository.createOrganisationRegistrationRequest({
    submittedOrganisationName: input.organisationName,
    submittedWebsite: normalisedWebsite,
    submittedPrimaryDomain: primaryDomain,
    representativeFirstName: input.representativeFirstName,
    representativeLastName: input.representativeLastName,
    representativeEmail: input.representativeEmail,
  });

  const emailResult = await requestRequestReceivedEmail({
    requestId: request.id,
    organisationName: request.submittedOrganisationName,
    representativeEmail: request.representativeEmail,
  });

  await recordRequestCreatedAudit(request.id);

  return {
    requestId: request.id,
    status: 'PENDING_REVIEW',
    confirmationEmailQueued: emailResult.queued,
  };
}

async function assertNoDuplicateOrganisationRequest(input: {
  organisationName: string;
  website: string;
  primaryDomain: string;
  representativeEmail: string;
}) {
  const existingOrganisation = await OrganisationRequestRepository.findOrganisationByName(
    input.organisationName,
  );
  if (existingOrganisation) {
    throw duplicateRequestError();
  }

  const duplicateName = await OrganisationRequestRepository.findActiveRequestByOrganisationName(
    input.organisationName,
  );
  if (duplicateName) {
    throw duplicateRequestError();
  }

  const duplicateWebsite =
    await OrganisationRequestRepository.findActiveRequestByWebsiteOrDomain(input);
  if (duplicateWebsite) {
    throw duplicateRequestError();
  }

  const duplicateRepresentative =
    await OrganisationRequestRepository.findActiveRequestByRepresentativeEmail(
      input.representativeEmail,
    );
  if (duplicateRepresentative) {
    throw duplicateRequestError();
  }
}

async function assertNoRepresentativeRoleConflict(representativeEmail: string) {
  const subject = await UserRepository.findAuthSubjectByEmail(representativeEmail);

  if (subject.user) {
    throw new OrganisationRegistrationRequestError(
      409,
      'ORGANISATION_REQUEST_REPRESENTATIVE_CONFLICT',
      'The organisation registration request conflicts with existing account records.',
    );
  }
}

function duplicateRequestError() {
  return new OrganisationRegistrationRequestError(
    409,
    'ORGANISATION_REQUEST_CONFLICT',
    'The organisation registration request conflicts with an existing request or organisation.',
  );
}

async function requestRequestReceivedEmail(input: {
  requestId: string;
  organisationName: string;
  representativeEmail: string;
}) {
  try {
    return await requestAuthEmailSend({
      emailType: 'ORGANISATION_REQUEST_RECEIVED',
      recipientEmail: input.representativeEmail,
      organisationRegistrationRequestId: input.requestId,
      templateData: {
        organisationName: input.organisationName,
      },
    });
  } catch {
    return {
      queued: false,
      reason: 'EMAIL_SEND_FAILED' as const,
    };
  }
}

async function recordRequestCreatedAudit(requestId: string) {
  try {
    await recordAuditLog({
      actorType: 'SYSTEM',
      targetType: 'ORGANISATION_REGISTRATION_REQUEST',
      targetId: requestId,
      actionType: 'CREATED',
      metadata: {
        source: 'public_organisation_registration_request',
      },
    });
  } catch {
    return;
  }
}

function normaliseWebsiteUrl(value: string) {
  const url = new URL(value);
  url.hash = '';
  url.search = '';
  return url.toString().replace(/\/$/, '');
}

function primaryDomainFromWebsite(value: string) {
  const hostname = new URL(value).hostname.toLowerCase();
  return hostname.startsWith('www.') ? hostname.slice(4) : hostname;
}
