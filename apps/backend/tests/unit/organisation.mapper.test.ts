import { describe, expect, it } from 'vitest';
import {
  resolveOrganisationDetailType,
  toBaseOrganisationDto,
} from '../../src/mappers/organisation.mapper.js';

describe('organisation mapper', () => {
  it('resolves organisation detail types based on organisation status', () => {
    expect(resolveOrganisationDetailType('PENDING_ONBOARDING')).toBe('onboarding organisation');
    expect(resolveOrganisationDetailType('ACTIVE')).toBe('active organisation');
    expect(resolveOrganisationDetailType('SUSPENDED')).toBe('suspended organisation');
    expect(resolveOrganisationDetailType('DISABLED')).toBe('disabled organisation');
    expect(resolveOrganisationDetailType('ARCHIVED')).toBe('disabled organisation');
    expect(resolveOrganisationDetailType('INACTIVE')).toBe('disabled organisation');
  });

  it('maps an organisation record to base organisation DTO', () => {
    const organisation = {
      id: 'org-1',
      name: 'Cyber Jan Technologies',
      status: 'ACTIVE' as const,
      description: 'Consulting',
      approximateSize: 100,
      website: 'https://cyberjan.co.za',
      primaryDomain: 'cyberjan.co.za',
      createdAt: new Date('2026-07-01T08:00:00.000Z'),
      updatedAt: new Date('2026-07-02T08:00:00.000Z'),
    };

    const dto = toBaseOrganisationDto(organisation);

    expect(dto).toEqual({
      id: 'org-1',
      name: 'Cyber Jan Technologies',
      status: 'ACTIVE',
      detailType: 'active organisation',
      description: 'Consulting',
      approximateSize: 100,
      website: 'https://cyberjan.co.za',
      primaryDomain: 'cyberjan.co.za',
      createdAt: '2026-07-01T08:00:00.000Z',
      updatedAt: '2026-07-02T08:00:00.000Z',
    });
  });
});
