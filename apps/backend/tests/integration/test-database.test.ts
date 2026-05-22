import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';

describe('test database cleanup', () => {
  it('starts empty and can create a health check row', async () => {
    await expect(prisma.healthCheck.count()).resolves.toBe(0);

    await prisma.healthCheck.create({
      data: {
        message: 'integration cleanup proof',
      },
    });

    await expect(prisma.healthCheck.count()).resolves.toBe(1);
  });

  it('starts empty again before the next test', async () => {
    await expect(prisma.healthCheck.count()).resolves.toBe(0);
  });
});

describe('GET /health', () => {
  it('returns 200 when the test database is migrated and reachable', async () => {
    const response = await request(createApp()).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('database', 'connected');
  });
});
