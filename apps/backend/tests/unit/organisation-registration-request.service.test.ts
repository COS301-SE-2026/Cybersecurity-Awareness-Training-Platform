import type { CreateOrganisationRegistrationRequestDto } from '@insightful-phish/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createOrganisationRegistrationRequest,
  OrganisationRegistrationRequestError,
} from '../../src/services/organisation-registration-request.service.js';

const repositoryMock = vi.hoisted(() => ({
  findOrganisationByName: vi.fn(),
  findActiveRequestByOrganisationName: vi.fn(),
  findActiveRequestByWebsiteOrDomain: vi.fn(),
  findActiveRequestByRepresentativeEmail: vi.fn(),
  createOrganisationRegistrationRequest: vi.fn(),
}));

const userRepositoryMock = vi.hoisted(() => ({
  findAuthSubjectByEmail: vi.fn(),
}));

const emailHookMock = vi.hoisted(() => ({
  requestAuthEmailSend: vi.fn(),
}));

const auditLogMock = vi.hoisted(() => ({
  recordAuditLog: vi.fn(),
}));

vi.mock(
  '../../src/repositories/organisation-registration-request.repository.js',
  () => repositoryMock,
);
vi.mock('../../src/repositories/user.repository.js', () => userRepositoryMock);
vi.mock('../../src/services/auth-email-hook.service.js', () => emailHookMock);
vi.mock('../../src/services/audit-log.service.js', () => auditLogMock);

function validInput(): CreateOrganisationRegistrationRequestDto {
  return {
    organisationName: 'Example Consulting',
    organisationDescription: 'A fake consulting organisation for tests.',
    organisationSize: 75,
    organisationWebsiteUrl: 'https://www.example-consulting.test/contact?ref=test',
    representativeFirstName: 'Adriano',
    representativeLastName: 'Jorge',
    representativeEmail: 'adriano@example.test',
  };
}

function mockNoExistingConflicts() {
  repositoryMock.findOrganisationByName.mockResolvedValue(null);
  repositoryMock.findActiveRequestByOrganisationName.mockResolvedValue(null);
  repositoryMock.findActiveRequestByWebsiteOrDomain.mockResolvedValue(null);
  repositoryMock.findActiveRequestByRepresentativeEmail.mockResolvedValue(null);
  userRepositoryMock.findAuthSubjectByEmail.mockResolvedValue({ user: null });
}

function mockCreatedRequest() {
  repositoryMock.createOrganisationRegistrationRequest.mockResolvedValue({
    id: 'request-1',
    submittedOrganisationName: 'Example Consulting',
    submittedWebsite: 'https://www.example-consulting.test/contact',
    submittedPrimaryDomain: 'example-consulting.test',
    representativeEmail: 'adriano@example.test',
    status: 'PENDING_REVIEW',
  });
}

describe('createOrganisationRegistrationRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNoExistingConflicts();
    mockCreatedRequest();
    emailHookMock.requestAuthEmailSend.mockResolvedValue({
      status: 'QUEUED',
      queueAccepted: true,
      queued: true,
      deliveryLogId: 'email-log-1',
      jobId: 'email-job-1',
    });
    auditLogMock.recordAuditLog.mockResolvedValue({ id: 'audit-1' });
  });

  it('creates a pending request with only fields supported by the current schema', async () => {
    const response = await createOrganisationRegistrationRequest(validInput());

    expect(repositoryMock.findOrganisationByName).toHaveBeenCalledWith('Example Consulting');
    expect(repositoryMock.findActiveRequestByWebsiteOrDomain).toHaveBeenCalledWith({
      website: 'https://www.example-consulting.test/contact',
      primaryDomain: 'example-consulting.test',
    });
    expect(repositoryMock.createOrganisationRegistrationRequest).toHaveBeenCalledWith({
      submittedOrganisationName: 'Example Consulting',
      submittedWebsite: 'https://www.example-consulting.test/contact',
      submittedOrganisationDescription: 'A fake consulting organisation for tests.',
      submittedOrganisationSize: 75,
      submittedPrimaryDomain: 'example-consulting.test',
      representativeFirstName: 'Adriano',
      representativeLastName: 'Jorge',
      representativeEmail: 'adriano@example.test',
    });
    expect(response).toEqual({
      requestId: 'request-1',
      status: 'PENDING_REVIEW',
      confirmationEmailQueued: true,
    });
  });

  it('normalises website domains before duplicate checks and persistence', async () => {
    await createOrganisationRegistrationRequest({
      ...validInput(),
      organisationWebsiteUrl: 'https://Example-Consulting.test/',
    });

    expect(repositoryMock.findActiveRequestByWebsiteOrDomain).toHaveBeenCalledWith({
      website: 'https://example-consulting.test',
      primaryDomain: 'example-consulting.test',
    });
    expect(repositoryMock.createOrganisationRegistrationRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        submittedWebsite: 'https://example-consulting.test',
        submittedPrimaryDomain: 'example-consulting.test',
      }),
    );
  });

  it('uses the primary domain to catch protocol variants during duplicate checks', async () => {
    await createOrganisationRegistrationRequest({
      ...validInput(),
      organisationWebsiteUrl: 'http://example-consulting.test',
    });

    expect(repositoryMock.findActiveRequestByWebsiteOrDomain).toHaveBeenCalledWith({
      website: 'http://example-consulting.test',
      primaryDomain: 'example-consulting.test',
    });
  });

  it('sends the request received email after persistence through the central hook', async () => {
    await createOrganisationRegistrationRequest(validInput());

    expect(emailHookMock.requestAuthEmailSend).toHaveBeenCalledWith({
      emailType: 'ORGANISATION_REQUEST_RECEIVED',
      recipientEmail: 'adriano@example.test',
      organisationRegistrationRequestId: 'request-1',
      templateData: {
        organisationName: 'Example Consulting',
      },
    });
  });

  it('records a non-sensitive system audit entry after persistence', async () => {
    await createOrganisationRegistrationRequest(validInput());

    expect(auditLogMock.recordAuditLog).toHaveBeenCalledWith({
      actorType: 'SYSTEM',
      targetType: 'ORGANISATION_REGISTRATION_REQUEST',
      targetId: 'request-1',
      actionType: 'CREATED',
      metadata: {
        source: 'public_organisation_registration_request',
      },
    });
  });

  it('does not fail public submission when the confirmation email hook reports failure', async () => {
    emailHookMock.requestAuthEmailSend.mockResolvedValue({
      status: 'NOT_QUEUED',
      queueAccepted: false,
      queued: false,
      reason: 'EMAIL_QUEUE_FAILED',
      deliveryLogId: 'email-log-1',
    });

    await expect(createOrganisationRegistrationRequest(validInput())).resolves.toEqual({
      requestId: 'request-1',
      status: 'PENDING_REVIEW',
      confirmationEmailQueued: false,
    });
  });

  it('does not fail submission when audit logging fails', async () => {
    auditLogMock.recordAuditLog.mockRejectedValue(new Error('audit unavailable'));

    await expect(createOrganisationRegistrationRequest(validInput())).resolves.toEqual({
      requestId: 'request-1',
      status: 'PENDING_REVIEW',
      confirmationEmailQueued: true,
    });
  });

  it('returns a safe conflict for existing organisations', async () => {
    repositoryMock.findOrganisationByName.mockResolvedValue({ id: 'org-1' });

    await expect(createOrganisationRegistrationRequest(validInput())).rejects.toMatchObject({
      statusCode: 409,
      error: 'ORGANISATION_REQUEST_CONFLICT',
    });
    expect(repositoryMock.createOrganisationRegistrationRequest).not.toHaveBeenCalled();
  });

  it('returns a safe conflict for duplicate organisation request names', async () => {
    repositoryMock.findActiveRequestByOrganisationName.mockResolvedValue({ id: 'request-2' });

    await expect(createOrganisationRegistrationRequest(validInput())).rejects.toBeInstanceOf(
      OrganisationRegistrationRequestError,
    );
    expect(repositoryMock.createOrganisationRegistrationRequest).not.toHaveBeenCalled();
  });

  it('returns a safe conflict for duplicate request websites or domains', async () => {
    repositoryMock.findActiveRequestByWebsiteOrDomain.mockResolvedValue({ id: 'request-2' });

    await expect(createOrganisationRegistrationRequest(validInput())).rejects.toMatchObject({
      statusCode: 409,
      error: 'ORGANISATION_REQUEST_CONFLICT',
    });
    expect(repositoryMock.createOrganisationRegistrationRequest).not.toHaveBeenCalled();
  });

  it('returns a safe conflict for duplicate representative request emails', async () => {
    repositoryMock.findActiveRequestByRepresentativeEmail.mockResolvedValue({ id: 'request-2' });

    await expect(createOrganisationRegistrationRequest(validInput())).rejects.toMatchObject({
      statusCode: 409,
      error: 'ORGANISATION_REQUEST_CONFLICT',
    });
    expect(repositoryMock.createOrganisationRegistrationRequest).not.toHaveBeenCalled();
  });

  it('returns a safe conflict for representative role conflicts', async () => {
    userRepositoryMock.findAuthSubjectByEmail.mockResolvedValue({
      user: {
        id: 'user-1',
        userType: 'IP_ADMIN',
      },
    });

    await expect(createOrganisationRegistrationRequest(validInput())).rejects.toMatchObject({
      statusCode: 409,
      error: 'ORGANISATION_REQUEST_CONFLICT',
      message: 'The organisation registration request conflicts with existing records.',
    });
    expect(repositoryMock.createOrganisationRegistrationRequest).not.toHaveBeenCalled();
  });

  it('checks mixed-case representative email duplicates through repository lookup', async () => {
    repositoryMock.findActiveRequestByRepresentativeEmail.mockResolvedValue({
      id: 'request-2',
      representativeEmail: 'Adriano@Example.test',
    });

    await expect(createOrganisationRegistrationRequest(validInput())).rejects.toMatchObject({
      statusCode: 409,
      error: 'ORGANISATION_REQUEST_CONFLICT',
    });
    expect(repositoryMock.findActiveRequestByRepresentativeEmail).toHaveBeenCalledWith(
      'adriano@example.test',
    );
  });
});
