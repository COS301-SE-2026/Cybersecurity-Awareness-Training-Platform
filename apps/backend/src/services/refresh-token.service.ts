import type { RefreshTokenRevokedReason } from '../generated/prisma/enums.js';
import {
  createRefreshToken,
  findRefreshTokenByHash,
  markRefreshTokenUsedAndRotated,
  revokeRefreshToken,
  revokeSessionRefreshTokens,
  type CreateRefreshTokenInput,
} from '../repositories/refresh-token.repository.js';
import { revokeSessionById } from './auth-session.service.js';
import { generateOpaqueToken, hashOpaqueToken } from './token-hash.service.js';

export type RefreshTokenState =
  | 'VALID'
  | 'INVALID'
  | 'EXPIRED'
  | 'USED'
  | 'REVOKED'
  | 'SESSION_REVOKED'
  | 'SESSION_EXPIRED'
  | 'REUSE_DETECTED';

export type IssueRefreshTokenInput = Omit<CreateRefreshTokenInput, 'tokenHash'>;

export type IssueRefreshTokenResult = {
  rawToken: string;
  token: CreatedRefreshToken;
};

type CreatedRefreshToken = Awaited<ReturnType<typeof createRefreshToken>>;
type RefreshTokenWithSession = NonNullable<Awaited<ReturnType<typeof findRefreshTokenByHash>>>;
export type ValidateRefreshTokenResult =
  | { state: 'VALID'; token: RefreshTokenWithSession }
  | { state: Exclude<RefreshTokenState, 'VALID'>; token?: RefreshTokenWithSession };

export type RotatedRefreshTokenResult =
  | { state: 'ROTATED'; rawToken: string; token: CreatedRefreshToken; previousTokenId: string }
  | {
      state: Exclude<RefreshTokenState, 'VALID'>;
      token?: Awaited<ReturnType<typeof findRefreshTokenByHash>>;
    };

export async function issueRefreshToken(
  input: IssueRefreshTokenInput,
): Promise<IssueRefreshTokenResult> {
  const rawToken = generateOpaqueToken();
  const tokenHash = hashOpaqueToken(rawToken);
  const token = await createRefreshToken({ ...input, tokenHash });
  return { rawToken, token };
}

export async function validateRefreshToken(input: {
  rawToken: string;
  now?: Date;
}): Promise<ValidateRefreshTokenResult> {
  const tokenHash = hashOpaqueToken(input.rawToken);
  const token = await findRefreshTokenByHash(tokenHash);
  if (!token) {
    return { state: 'INVALID' };
  }

  const now = input.now ?? new Date();

  if (token.usedAt || token.replacedByTokenId) {
    await handleRefreshTokenReuse(token.authSessionId, token.id);
    return { state: 'REUSE_DETECTED', token };
  }

  if (token.revokedAt) {
    return { state: 'REVOKED', token };
  }

  if (token.expiresAt.getTime() <= now.getTime()) {
    return {
      state: 'EXPIRED',
      token,
    };
  }

  if (token.authSession.revokedAt) {
    return {
      state: 'SESSION_REVOKED',
      token,
    };
  }

  if (token.authSession.expiresAt.getTime() <= now.getTime()) {
    return {
      state: 'SESSION_EXPIRED',
      token,
    };
  }

  return {
    state: 'VALID',
    token,
  };
}

export async function rotateRefreshToken(input: {
  rawToken: string;
  nextEcpiresAt: Date;
  now?: Date;
}): Promise<RotatedRefreshTokenResult> {
  const valid = await validateRefreshToken({ rawToken: input.rawToken, now: input.now });
  if (valid.state !== 'VALID') {
    return valid;
  }

  const previousToken = valid.token;
  const rawToken = generateOpaqueToken();
  const tokenHash = hashOpaqueToken(rawToken);

  const nextToken = await createRefreshToken({
    authSessionId: previousToken.authSessionId,
    tokenHash,
    expiresAt: input.nextEcpiresAt,
  });

  await markRefreshTokenUsedAndRotated({
    id: previousToken.id,
    replacedByTokenId: nextToken.id,
  });

  return { state: 'ROTATED', rawToken, token: nextToken, previousTokenId: previousToken.id };
}

export async function revokeRefreshTokensForSessions(input: {
  authSessionId: string;
  reason: RefreshTokenRevokedReason;
}) {
  return revokeSessionRefreshTokens({
    authSessionId: input.authSessionId,
    revokedReason: input.reason,
  });
}

export async function handleRefreshTokenReuse(authSessionId: string, tokenId: string) {
  await revokeRefreshTokensForSessions({
    authSessionId,
    reason: 'TOKEN_REUSE_DETECTED',
  });

  await revokeSessionById({
    sessionId: authSessionId,
    reason: 'TOKEN_REUSE_DETECTED',
  });

  return { authSessionId, tokenId };
}
