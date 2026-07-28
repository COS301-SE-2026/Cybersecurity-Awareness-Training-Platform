import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { validateBody, validateParams } from '../../src/middleware/validateRequest.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import { apiRateLimit, clearApiRateLimitStore } from '../../src/middleware/apiRateLimit.js';

describe('Backend Guardrails & Consistency Middleware', () => {
  describe('Consolidated Validation Middleware', () => {
    it('validateBody should allow valid payload and return 400 for invalid payload', async () => {
      const app = express();
      app.use(express.json());
      const schema = z.object({ name: z.string().min(3) });
      app.post('/test', validateBody(schema), (req, res) => {
        res.json({ name: req.body.name });
      });

      const resValid = await request(app).post('/test').send({ name: 'Alice' });
      expect(resValid.status).toBe(200);
      expect(resValid.body).toEqual({ name: 'Alice' });

      const resInvalid = await request(app).post('/test').send({ name: 'Al' });
      expect(resInvalid.status).toBe(400);
      expect(resInvalid.body).toHaveProperty('error', 'VALIDATION_ERROR');
      expect(resInvalid.body).toHaveProperty('message', 'Invalid request payload');
      expect(resInvalid.body.details[0]).toHaveProperty('field', 'name');
    });

    it('validateParams should allow valid params and return 400 for invalid params', async () => {
      const app = express();
      const schema = z.object({ id: z.string().uuid() });
      app.get('/test/:id', validateParams(schema), (req, res) => {
        res.json({ id: req.params.id });
      });

      const validUuid = '11111111-1111-1111-1111-111111111111';
      const resValid = await request(app).get(`/test/${validUuid}`);
      expect(resValid.status).toBe(200);
      expect(resValid.body).toEqual({ id: validUuid });

      const resInvalid = await request(app).get('/test/invalid-uuid');
      expect(resInvalid.status).toBe(400);
      expect(resInvalid.body).toHaveProperty('error', 'VALIDATION_ERROR');
      expect(resInvalid.body).toHaveProperty('message', 'Invalid request parameters');
      expect(resInvalid.body.details[0]).toHaveProperty('field', 'id');
    });
  });

  describe('Central Fallback Error Handler', () => {
    it('should catch errors and return JSON ApiErrorResponse for client-side errors with raw message', async () => {
      const app = express();
      app.get('/error', (req, res, next) => {
        const err = Object.assign(new Error('Validation failed'), {
          status: 400,
          error: 'VALIDATION_ERROR',
        });
        next(err);
      });
      app.use(errorHandler);

      const response = await request(app).get('/error');
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'VALIDATION_ERROR',
        message: 'Validation failed',
      });
    });

    it('should fallback to 500 and INTERNAL_SERVER_ERROR for standard errors', async () => {
      const app = express();
      // Suppress console.error in tests to avoid cluttering test logs
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      app.get('/error', (req, res, next) => {
        next(new Error('Unexpected crash'));
      });
      app.use(errorHandler);

      const response = await request(app).get('/error');
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      });

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('API Rate Limiter', () => {
    it('should limit requests and reset via clearApiRateLimitStore', async () => {
      const app = express();
      app.use(apiRateLimit);
      app.get('/test', (req, res) => res.send('ok'));

      await clearApiRateLimitStore();

      // Make 100 requests (which is the limit)
      for (let i = 0; i < 100; i++) {
        const res = await request(app).get('/test');
        expect(res.status).toBe(200);
      }

      // The 101st request should be rate limited
      const resLimit = await request(app).get('/test');
      expect(resLimit.status).toBe(429);
      expect(resLimit.body).toEqual({
        error: 'TOO_MANY_REQUESTS',
        message: 'Too many requests from this IP, please try again after 15 minutes',
      });

      // Clear/reset store
      await clearApiRateLimitStore();

      // Request should succeed again
      const resAfterReset = await request(app).get('/test');
      expect(resAfterReset.status).toBe(200);
    });
  });
});
