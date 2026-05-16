import type { Request, Response } from 'express';
import { getHealthStatus } from '../services/health.service.js';

export async function getHealth(_req: Request, res: Response) {
  const health = await getHealthStatus();

  return res.status(health.statusCode).json(health.body);
}
