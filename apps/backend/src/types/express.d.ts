import type { PublicUserDto } from '@insightful-phish/shared';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        authSessionId?: string;
        user: PublicUserDto;
      };
    }
  }
}

export {};
