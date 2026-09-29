import {
  organisationContextMetadataSchema,
  type OrganisationContextMetadataDto,
  type OrganisationContextTypeDto,
} from '@insightful-phish/shared';
import { findAiUsableOrganisationContexts } from '../repositories/organisation.repository.js';
import { requireOrganisationAdminScope } from './organisation-scope.service.js';

export type AiOrganisationContextReference = {
  contextType: OrganisationContextTypeDto;
  name: string;
  description: string | null;
  contentSummary: string;
  contentKind: OrganisationContextMetadataDto['kind'] | null;
};

function optionalTrimmedText(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseContentKind(metadata: unknown): OrganisationContextMetadataDto['kind'] | null {
  const parsed = organisationContextMetadataSchema.safeParse(metadata);
  return parsed.success ? parsed.data.kind : null;
}

/**
 * Returns organisation context that an authorised campaign manager may supply
 * to AI generation as reference material. Lifecycle filtering remains in the
 * repository so unapproved records never cross this service boundary.
 */
export async function getApprovedOrganisationContextForAi(input: {
  actorUserId: string;
  organisationId: string;
}): Promise<AiOrganisationContextReference[]> {
  await requireOrganisationAdminScope({
    userId: input.actorUserId,
    organisationId: input.organisationId,
    requiredPermission: 'MANAGE_CAMPAIGNS',
  });

  const contexts = await findAiUsableOrganisationContexts(input.organisationId);

  return contexts.flatMap((context) => {
    const contentSummary = optionalTrimmedText(context.contentSummary);
    if (contentSummary === null) {
      return [];
    }

    return [
      {
        contextType: context.contextType,
        name: context.name.trim(),
        description: optionalTrimmedText(context.description),
        contentSummary,
        contentKind: parseContentKind(context.metadata),
      },
    ];
  });
}
