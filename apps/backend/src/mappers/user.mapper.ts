import type { PublicUserDto } from '@insightful-phish/shared';

interface UserRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  userType: PublicUserDto['userType'];
  authStatus: PublicUserDto['authStatus'];
  createdAt: Date;
}

export function toPublicUserDto(user: UserRecord): PublicUserDto {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    userType: user.userType,
    authStatus: user.authStatus,
    createdAt: user.createdAt.toISOString(),
  };
}
