import { z } from 'zod';

export const authRegisterRequestSchema = z.object({
  email: z.string().trim().email('PLEASE ENTER A VALID EMAIL ADDRESS').toLowerCase(),

  password: z
    .string()
    .min(8, 'PASSWORD MUST BE AT LEAST 8 CHARACTERS')
    .regex(/[A-Z]/, 'PASSWORD MUST CONTAIN AN UPPERCASE LETTER')
    .regex(/[a-z]/, 'PASSWORD MUST CONTAIN A LOWERCASE LETTER')
    .regex(/\d/, 'PASSWORD MUST CONTAIN A NUMBER')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'PASSWORD MUST CONTAIN A SPECIAL CHARACTER'),

  firstName: z.string().trim().min(1, 'FIRST NAME IS REQUIRED'),

  lastName: z.string().trim().min(1, 'LAST NAME IS REQUIRED'),
});

export const authLoginRequestSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1),
});
