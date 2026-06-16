import request from 'supertest';
import { createApp } from '../../src/app.js';

export const testUserPassword = ['pass', 'word'].join('');

export async function loginTestUser(email: string) {
  return await request(createApp()).post('/auth/login').send({ email, password: testUserPassword });
}
