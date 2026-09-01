import { describe, expect, it } from 'vitest';
import {
  getPlatformOrganisationParamsSchema,
  resendInitialAdminSetupParamsSchema,
  resendInitialAdminSetupResponseSchema,
  resendEligibilitySchema,
  timelineEventSchema,
  initialAdminSetupStatusSchema,
  organisationAdminSummarySchema,
  platformOrganisationDetailSchema,
  ownOrganisationDetailSchema,
} from './organisation.js';
import {
  getOrganisationRequestDetailsParamsSchema,
  platformOrganisationRequestDetailsResponseSchema,
} from './organisation-request.js';

const validUuid = '11111111-1111-4111-8111-111111111111';
const invalidUuid = 'not-a-uuid';

describe('organisation validation schemas', () => {
  describe('Params Schemas', () => {
    it('validates getPlatformOrganisationParamsSchema', () => {
      expect(getPlatformOrganisationParamsSchema.parse({ organisationId: validUuid })).toEqual({
        organisationId: validUuid,
      });

      expect(() =>
        getPlatformOrganisationParamsSchema.parse({ organisationId: invalidUuid }),
      ).toThrow();
    });

    it('validates resendInitialAdminSetupParamsSchema', () => {
      expect(resendInitialAdminSetupParamsSchema.parse({ organisationId: validUuid })).toEqual({
        organisationId: validUuid,
      });

      expect(() =>
        resendInitialAdminSetupParamsSchema.parse({ organisationId: invalidUuid }),
      ).toThrow();
    });

    it('validates getOrganisationRequestDetailsParamsSchema', () => {
      expect(getOrganisationRequestDetailsParamsSchema.parse({ requestId: validUuid })).toEqual({
        requestId: validUuid,
      });

      expect(() =>
        getOrganisationRequestDetailsParamsSchema.parse({ requestId: invalidUuid }),
      ).toThrow();
    });
  });

  describe('Response & Support Schemas', () => {
    it('validates resendInitialAdminSetupResponseSchema', () => {
      const valid = { success: true, emailQueued: false, setupStatus: null };
      expect(resendInitialAdminSetupResponseSchema.parse(valid)).toEqual(valid);
      expect(() => resendInitialAdminSetupResponseSchema.parse({ success: true })).toThrow();
    });

    it('validates resendEligibilitySchema', () => {
      const validEligible = { isEligible: true, reason: null };
      const validIneligible = { isEligible: false, reason: 'ORGANISATION_NOT_ONBOARDING' };
      expect(resendEligibilitySchema.parse(validEligible)).toEqual(validEligible);
      expect(resendEligibilitySchema.parse(validIneligible)).toEqual(validIneligible);
      expect(() => resendEligibilitySchema.parse({ isEligible: true })).toThrow();
      // Unknown reason codes should be rejected
      expect(() =>
        resendEligibilitySchema.parse({ isEligible: false, reason: 'UNKNOWN_CODE' }),
      ).toThrow();
    });

    it('validates timelineEventSchema', () => {
      const validAuditLog = {
        id: validUuid,
        type: 'AUDIT_LOG',
        timestamp: '2026-07-01T08:00:00.000Z',
        action: 'APPROVED',
        summary: 'APPROVED on ORGANISATION_REGISTRATION_REQUEST',
        actor: 'Patricia Platform',
        outcome: 'SUCCESS',
        metadata: null,
      };

      const validEmailDelivery = {
        id: validUuid,
        type: 'EMAIL_DELIVERY',
        timestamp: '2026-07-01T08:00:00.000Z',
        action: 'INITIAL_ORGANISATION_ADMIN_SETUP',
        summary: 'Setup email sent',
        actor: 'System',
        outcome: 'SENT',
        metadata: null,
      };

      expect(timelineEventSchema.parse(validAuditLog)).toEqual(validAuditLog);
      expect(timelineEventSchema.parse(validEmailDelivery)).toEqual(validEmailDelivery);
      expect(() => timelineEventSchema.parse({ id: validUuid, type: 'INVALID' })).toThrow();
      // metadata must be null -- records are not allowed
      expect(() =>
        timelineEventSchema.parse({ ...validAuditLog, metadata: { foo: 'bar' } }),
      ).toThrow();
    });

    it('validates initialAdminSetupStatusSchema', () => {
      const validSetupStatus = {
        id: validUuid,
        status: 'PENDING',
        recipientEmail: 'recipient@example.com',
        expiresAt: '2026-07-08T08:00:00.000Z',
        latestActionToken: {
          id: validUuid,
          expiresAt: '2026-07-08T08:00:00.000Z',
          usedAt: null,
          revokedAt: null,
          status: 'AVAILABLE',
        },
        latestEmailDelivery: {
          id: validUuid,
          deliveryStatus: 'SENT',
          sentAt: '2026-07-01T08:00:00.000Z',
          failedAt: null,
          failureReason: null,
        },
      };

      expect(initialAdminSetupStatusSchema.parse(null)).toBeNull();
      expect(initialAdminSetupStatusSchema.parse(validSetupStatus)).toEqual(validSetupStatus);

      const revokedSetupStatus = {
        ...validSetupStatus,
        latestActionToken: {
          id: validUuid,
          expiresAt: '2026-07-08T08:00:00.000Z',
          usedAt: '2026-07-02T08:00:00.000Z',
          revokedAt: '2026-07-03T08:00:00.000Z',
          status: 'REVOKED' as const,
        },
      };
      expect(initialAdminSetupStatusSchema.parse(revokedSetupStatus)).toEqual(revokedSetupStatus);
    });

    it('validates organisationAdminSummarySchema', () => {
      const validAdmin = {
        id: validUuid,
        adminStatus: 'ACTIVE',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        isInitialAdmin: false,
      };

      expect(organisationAdminSummarySchema.parse(validAdmin)).toEqual(validAdmin);
      expect(() => organisationAdminSummarySchema.parse({ id: validUuid })).toThrow();
    });

    it('validates platformOrganisationDetailSchema', () => {
      const validDetail = {
        id: validUuid,
        name: 'Target Org',
        status: 'ACTIVE',
        detailType: 'active organisation',
        description: 'A mock organization',
        approximateSize: 150,
        website: 'https://example.com',
        primaryDomain: 'example.com',
        createdAt: '2026-07-01T08:00:00.000Z',
        updatedAt: '2026-07-01T08:00:00.000Z',
        _count: {
          adminProfiles: 2,
          traineeProfiles: 15,
        },
        registrationRequest: {
          id: validUuid,
          representativeFirstName: 'John',
          representativeLastName: 'Doe',
          representativeEmail: 'john@example.com',
          submittedWebsite: 'https://example.com',
          submittedPrimaryDomain: 'example.com',
        },
        setupStatus: null,
        resendEligibility: { isEligible: false, reason: 'ORGANISATION_NOT_ONBOARDING' },
        admins: [],
        timeline: [],
      };

      expect(platformOrganisationDetailSchema.parse(validDetail)).toEqual(validDetail);
    });

    it('validates platformOrganisationRequestDetailsResponseSchema', () => {
      const validRequestDetail = {
        id: validUuid,
        submittedOrganisationName: 'Example Org',
        detailType: 'request-only',
        submittedWebsite: null,
        submittedOrganisationDescription: null,
        submittedOrganisationSize: 50,
        submittedPrimaryDomain: null,
        representativeFirstName: 'Jane',
        representativeLastName: 'Smith',
        representativeEmail: 'jane@example.com',
        representativePhone: null,
        status: 'PENDING_REVIEW',
        contactedByIpAdminId: null,
        approvedByIpAdminId: null,
        rejectedByIpAdminId: null,
        approvedOrganisationId: null,
        contactedAt: null,
        approvedAt: null,
        rejectedAt: null,
        rejectionReason: null,
        createdAt: '2026-07-01T08:00:00.000Z',
        updatedAt: '2026-07-01T08:00:00.000Z',
        setupStatus: null,
        resendEligibility: { isEligible: false, reason: 'INVITATION_NOT_ELIGIBLE' },
        timeline: [],
      };

      expect(platformOrganisationRequestDetailsResponseSchema.parse(validRequestDetail)).toEqual(
        validRequestDetail,
      );
    });

    it('validates ownOrganisationDetailSchema', () => {
      const validOwnDetail = {
        id: validUuid,
        name: 'Cyber Jan Technologies',
        description: 'South African consultancy',
        website: 'https://cyberjan.co.za',
        approximateSize: 250,
        registeredTraineeCount: 45,
        registrationDate: '2026-07-01T08:00:00.000Z',
        status: 'ACTIVE' as const,
      };

      expect(ownOrganisationDetailSchema.parse(validOwnDetail)).toEqual(validOwnDetail);

      const withNulls = {
        id: validUuid,
        name: 'Cyber Jan Technologies',
        description: null,
        website: null,
        approximateSize: null,
        registeredTraineeCount: 0,
        registrationDate: '2026-07-01T08:00:00.000Z',
        status: 'ACTIVE' as const,
      };

      expect(ownOrganisationDetailSchema.parse(withNulls)).toEqual(withNulls);
      expect(() =>
        ownOrganisationDetailSchema.parse({ ...validOwnDetail, id: 'invalid-uuid' }),
      ).toThrow();
    });
  });
});
