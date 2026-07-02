import { describe, expect, it } from 'vitest';
import { createOrganisationRegistrationRequestSchema } from './organisation-registration.schemas.js';

const validPayload = {
  organisationName: 'Example Consulting',
  organisationDescription: 'A fake consulting organisation for tests.',
  organisationSize: 75,
  organisationWebsiteUrl: 'https://example-consulting.test',
  representativeFirstName: 'Adriano',
  representativeLastName: 'Jorge',
  representativeEmail: 'Adriano@Example.test',
};

describe('organisation registration request validation', () => {
  it('accepts and normalises a valid request', () => {
    const result = createOrganisationRegistrationRequestSchema.safeParse(validPayload);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.representativeEmail).toBe('adriano@example.test');
    }
  });

  it('trims representative and organisation names', () => {
    const result = createOrganisationRegistrationRequestSchema.safeParse({
      ...validPayload,
      organisationName: ' Example Consulting ',
      representativeFirstName: ' Adriano ',
      representativeLastName: ' Jorge ',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.organisationName).toBe('Example Consulting');
      expect(result.data.representativeFirstName).toBe('Adriano');
      expect(result.data.representativeLastName).toBe('Jorge');
    }
  });

  it('rejects invalid website URLs', () => {
    const result = createOrganisationRegistrationRequestSchema.safeParse({
      ...validPayload,
      organisationWebsiteUrl: 'not-a-url',
    });

    expect(result.success).toBe(false);
  });

  it.each(['http://example-consulting.test', 'https://example-consulting.test'])(
    'accepts web URL scheme %s',
    (organisationWebsiteUrl) => {
      const result = createOrganisationRegistrationRequestSchema.safeParse({
        ...validPayload,
        organisationWebsiteUrl,
      });

      expect(result.success).toBe(true);
    },
  );

  it.each([
    'mailto:admin@example.test',
    'ftp://example.test',
    'file:///tmp/example',
    'data:text/plain,test',
  ])('rejects non-web URL scheme %s', (organisationWebsiteUrl) => {
    const result = createOrganisationRegistrationRequestSchema.safeParse({
      ...validPayload,
      organisationWebsiteUrl,
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid organisation sizes', () => {
    const result = createOrganisationRegistrationRequestSchema.safeParse({
      ...validPayload,
      organisationSize: 0,
    });

    expect(result.success).toBe(false);
  });

  it.each([1, 250, 100000])('accepts valid numeric organisation size %s', (organisationSize) => {
    const result = createOrganisationRegistrationRequestSchema.safeParse({
      ...validPayload,
      organisationSize,
    });

    expect(result.success).toBe(true);
  });

  it.each([-1, 0, 1.5, 100001, 'SMALL'])(
    'rejects invalid numeric organisation size %s',
    (organisationSize) => {
      const result = createOrganisationRegistrationRequestSchema.safeParse({
        ...validPayload,
        organisationSize,
      });

      expect(result.success).toBe(false);
    },
  );

  it('rejects unexpected fields', () => {
    const result = createOrganisationRegistrationRequestSchema.safeParse({
      ...validPayload,
      unexpectedField: 'not allowed',
    });

    expect(result.success).toBe(false);
  });

  it.each([
    ['ommited', undefined],
    ['empty string', ''],
    ['only spaces string', '    '],
  ])(
    'treats optional organisation description %s as not provided',
    (_caseName, organisationDescription) => {
      const paylod = { ...validPayload };
      if (organisationDescription === undefined) {
        delete (paylod as Partial<typeof validPayload>).organisationDescription;
      } else {
        paylod.organisationDescription = organisationDescription;
      }
      const result = createOrganisationRegistrationRequestSchema.safeParse(paylod);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.organisationDescription).toBeUndefined();
      }
    },
  );
  it.each([
    ['ommited', undefined],
    ['empty string', ''],
    ['only spaces string', '    '],
  ])(
    'treats optional organisation organisation url %s as not provided',
    (_caseName, organisationDescription) => {
      const paylod = { ...validPayload };
      if (organisationDescription === undefined) {
        delete (paylod as Partial<typeof validPayload>).organisationWebsiteUrl;
      } else {
        paylod.organisationWebsiteUrl = organisationDescription;
      }
      const result = createOrganisationRegistrationRequestSchema.safeParse(paylod);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.organisationWebsiteUrl).toBeUndefined();
      }
    },
  );
});
