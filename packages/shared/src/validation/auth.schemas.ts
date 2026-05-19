import { z } from 'zod';

export const authRegisterRequestSchema = z
  .object({
    email: z.string().trim().email().toLowerCase(),
    password: z
      .string()
      .min(12, 'Password must be at least 12 characters long')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/\d/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
  })
  .strict();

export const authLoginRequestSchema = z
  .object({
    email: z.string().trim().email().toLowerCase(),
    password: z.string().min(1),
  })
  .strict();
