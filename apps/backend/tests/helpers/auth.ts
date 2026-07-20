import request from 'supertest';
import { createApp } from '../../src/app.js';
import { createOrganisationAdminTestFixture } from './factories.js';

export const testUserPassword = ['pass', 'word'].join('');

export async function loginTestUser(email: string) {
  return await request(createApp()).post('/auth/login').send({ email, password: testUserPassword });
}

export async function loginOrganisationAdmin(
  overrides?: Parameters<typeof createOrganisationAdminTestFixture>[0],
) {
  const fixture = await createOrganisationAdminTestFixture(overrides);
  const loginRes = await loginTestUser(fixture.user.email);
  if (loginRes.status !== 200 || !loginRes.body.token) {
    throw new Error(`Failed to log in organisation admin: ${JSON.stringify(loginRes.body)}`);
  }
  return {
    ...fixture,
    token: loginRes.body.token as string,
  };
}
