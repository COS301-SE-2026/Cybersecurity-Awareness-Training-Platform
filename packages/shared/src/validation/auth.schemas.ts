import { z } from 'zod';

export const authRegisterRequestSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
});

export const authLoginRequestSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1),
});
