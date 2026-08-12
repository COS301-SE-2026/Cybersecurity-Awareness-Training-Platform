import type { OrganisationPermissionKeyDto } from '@insightful-phish/shared';
import * as OrganisationScopeRepository from '../repositories/organisation-scope.repository.js';

export class OrganisationScopeServiceError extends Error {
  constructor(
    public readonly statusCode: 401 | 403 | 404,
    public readonly error: string,
    message: string,
  ) {
    super(message);
    this.name = 'OrganisationScopeServiceError';
  }
}

export type ValidatedOrganisationAdminScope = {
  adminProfileId: string;
  userId: string;
  organisationId: string;
  grantedPermissions: Set<string>;
};

export async function requireOrganisationAdminScope(input: {
  userId: string;
  organisationId: string;
  requiredPermission?: OrganisationPermissionKeyDto;
}): Promise<ValidatedOrganisationAdminScope> {
  const adminActor = await OrganisationScopeRepository.findOrganisationAdminActorScope({
    userId: input.userId,
    organisationId: input.organisationId,
  });

  if (!adminActor) {
    const traineeActor = await OrganisationScopeRepository.findOrganisationTraineeActorScope({
      userId: input.userId,
      organisationId: input.organisationId,
    });

    if (traineeActor) {
      if (traineeActor.organisation.status !== 'ACTIVE') {
        throw new OrganisationScopeServiceError(
          403,
          'ORGANISATION_NOT_ACTIVE',
          'Organisation is not active',
        );
      }

      throw new OrganisationScopeServiceError(
        403,
        'FORBIDDEN_ORGANISATION_ROLE',
        'Trainees cannot perform administration actions',
      );
    }

    throw new OrganisationScopeServiceError(
      404,
      'INACCESSIBLE_ORGANISATION',
      'Inaccessible organisation',
    );
  }

  if (adminActor.organisation.status !== 'ACTIVE') {
    throw new OrganisationScopeServiceError(
      403,
      'ORGANISATION_NOT_ACTIVE',
      'Organisation is not active',
    );
  }

  const grantedPermissions = new Set(
    adminActor.permissionGrants.map((grant) => grant.organisationPermission.key),
  );

  if (input.requiredPermission && !grantedPermissions.has(input.requiredPermission)) {
    throw new OrganisationScopeServiceError(
      403,
      'MISSING_REQUIRED_PERMISSION',
      `Required permission ${input.requiredPermission} is missing`,
    );
  }

  return {
    adminProfileId: adminActor.id,
    userId: input.userId,
    organisationId: input.organisationId,
    grantedPermissions,
  };
}

export async function validateOrganisationScopeExists(organisationId: string) {
  const org = await OrganisationScopeRepository.findOrganisationScopeById(organisationId);
  if (!org || org.status !== 'ACTIVE') {
    throw new OrganisationScopeServiceError(
      404,
      'INACCESSIBLE_ORGANISATION',
      'Inaccessible organisation',
    );
  }
  return org;
}
