import type { OrganisationStatus } from '../generated/prisma/enums.js';

export type OrganisationDetailType =
  | 'onboarding organisation'
  | 'active organisation'
  | 'suspended organisation'
  | 'disabled organisation';

export function resolveOrganisationDetailType(status: OrganisationStatus): OrganisationDetailType {
  if (status === 'PENDING_ONBOARDING') {
    return 'onboarding organisation';
  }
  if (status === 'ACTIVE') {
    return 'active organisation';
  }
  if (status === 'SUSPENDED') {
    return 'suspended organisation';
  }
  return 'disabled organisation';
}

export interface BaseOrganisationRecord {
  id: string;
  name: string;
  status: OrganisationStatus;
  description: string | null;
  approximateSize: number | null;
  website: string | null;
  primaryDomain: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toBaseOrganisationDto(organisation: BaseOrganisationRecord) {
  return {
    id: organisation.id,
    name: organisation.name,
    status: organisation.status,
    detailType: resolveOrganisationDetailType(organisation.status),
    description: organisation.description,
    approximateSize: organisation.approximateSize,
    website: organisation.website,
    primaryDomain: organisation.primaryDomain,
    createdAt: organisation.createdAt.toISOString(),
    updatedAt: organisation.updatedAt.toISOString(),
  };
}
