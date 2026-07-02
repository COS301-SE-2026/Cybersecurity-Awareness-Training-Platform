import { describe, expect, it } from 'vitest';
import {
  organisationAdminIdParamsSchema,
  organisationAdminPermissionUpdateRequestSchema,
  organisationAdminPromotionRequestSchema,
  organisationAdminRemoveRequestSchema,
  organisationIdParamsSchema,
} from './organisation-admin.schemas.js';

const organisationId = '11111111-1111-4111-8111-111111111111';
const adminId = '22222222-2222-4222-8222-222222222222';
const removeConfirmationSecret = ['local', 'test', 'remove', 'confirmation'].join('-');

describe('organisation admin validation schemas', () => {
  it('validates organisation and admin route params as UUIDs', () => {
    expect(organisationIdParamsSchema.parse({ organisationId })).toEqual({ organisationId });
    expect(organisationAdminIdParamsSchema.parse({ organisationId, adminId })).toEqual({
      organisationId,
      adminId,
    });

    expect(() => organisationIdParamsSchema.parse({ organisationId: 'not-a-uuid' })).toThrow();
    expect(() =>
      organisationAdminIdParamsSchema.parse({ organisationId, adminId: 'not-a-uuid' }),
    ).toThrow();
  });

  it('normalises promotion email and deduplicates requested permission keys', () => {
    expect(
      organisationAdminPromotionRequestSchema.parse({
        traineeEmail: ' Trainee@Example.test ',
        permissionKeys: [
          'VIEW_ORGANISATION_ADMINS',
          'VIEW_ORGANISATION_ADMINS',
          'INVITE_ORGANISATION_ADMINS',
        ],
      }),
    ).toEqual({
      traineeEmail: 'trainee@example.test',
      permissionKeys: ['VIEW_ORGANISATION_ADMINS', 'INVITE_ORGANISATION_ADMINS'],
    });
  });

  it('requires at least one permission for promotion and permission updates', () => {
    expect(() =>
      organisationAdminPromotionRequestSchema.parse({
        traineeEmail: 'trainee@example.test',
        permissionKeys: [],
      }),
    ).toThrow();

    expect(() =>
      organisationAdminPermissionUpdateRequestSchema.parse({ permissionKeys: [] }),
    ).toThrow();
  });

  it('requires explicit remove confirmation and password presence', () => {
    expect(
      organisationAdminRemoveRequestSchema.parse({
        password: removeConfirmationSecret,
        confirmation: 'REMOVE',
      }),
    ).toEqual({
      password: removeConfirmationSecret,
      confirmation: 'REMOVE',
    });

    expect(() =>
      organisationAdminRemoveRequestSchema.parse({
        password: '',
        confirmation: 'REMOVE',
      }),
    ).toThrow();
    expect(() =>
      organisationAdminRemoveRequestSchema.parse({
        password: removeConfirmationSecret,
        confirmation: 'DELETE',
      }),
    ).toThrow();
  });
});
