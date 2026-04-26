import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('GET /health', () => {
  it('returns API and database status', async () => {
    const response = await request(createApp()).get('/health');

    expect([200, 500]).toContain(response.status);
    expect(response.body).toHaveProperty('app', 'Insightful Phish');
    expect(response.body).toHaveProperty('api', 'working');
    expect(response.body).toHaveProperty('database');
  });
});
