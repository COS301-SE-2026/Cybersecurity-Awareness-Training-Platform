import type { RefreshTokenRevokedReason } from '../generated/prisma/enums.js';
import {
  createRefreshToken,
  findRefreshTokenByHash,
  revokeRefreshToken,
  revokeSessionRefreshTokens,
  rotateRefreshTokenRecord,
  type CreateRefreshTokenInput,
} from '../repositories/refresh-token.repository.js';
import { revokeSessionById, validateAuthSession } from './auth-session.service.js';
import { generateOpaqueToken, hashOpaqueToken } from './token-hash.service.js';
import { recordRefreshTokenReuseDetected } from './auth-audit.service.js';

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
    await handleRefreshTokenReuse(token.authSessionId, token.id, {
      userId: token.authSession.userId,
    });
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

  const sessionValidation = await validateAuthSession({
    sessionId: token.authSessionId,
    now,
    touch: false,
  });

  if (sessionValidation.state === 'REVOKED') {
    return {
      state: 'SESSION_REVOKED',
      token,
    };
  }

  if (sessionValidation.state === 'EXPIRED' || sessionValidation.state === 'IDLE_TIMEOUT') {
    return {
      state: 'SESSION_EXPIRED',
      token,
    };
  }

  if (sessionValidation.state === 'MISSING') {
    return {
      state: 'SESSION_REVOKED',
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
  nextExpiresAt: Date;
  now?: Date;
}): Promise<RotatedRefreshTokenResult> {
  const valid = await validateRefreshToken({ rawToken: input.rawToken, now: input.now });
  if (valid.state !== 'VALID') {
    return valid;
  }

  const previousToken = valid.token;
  const rawToken = generateOpaqueToken();
  const tokenHash = hashOpaqueToken(rawToken);

  const nextToken = await rotateRefreshTokenRecord({
    previousTokenId: previousToken.id,
    authSessionId: previousToken.authSessionId,
    nextTokenHash: tokenHash,
    nextExpiresAt: input.nextExpiresAt,
  });

  if (!nextToken) {
    await handleRefreshTokenReuse(previousToken.authSessionId, previousToken.id);
    return { state: 'REUSE_DETECTED', token: previousToken };
  }

  return { state: 'ROTATED', rawToken, token: nextToken, previousTokenId: previousToken.id };
}

export async function revokeRefreshTokensForSession(input: {
  authSessionId: string;
  reason: RefreshTokenRevokedReason;
}) {
  return revokeSessionRefreshTokens({
    authSessionId: input.authSessionId,
    revokedReason: input.reason,
  });
}

export async function handleRefreshTokenReuse(
  authSessionId: string,
  tokenId: string,
  input: { userId?: string | null; ipAddress?: string | null; userAgent?: string | null } = {},
) {
  await revokeRefreshTokensForSession({
    authSessionId,
    reason: 'TOKEN_REUSE_DETECTED',
  });

  await revokeSessionById({
    sessionId: authSessionId,
    reason: 'TOKEN_REUSE_DETECTED',
  });

  await recordRefreshTokenReuseDetected({
    userId: input.userId ?? null,
    authSessionId,
    refreshTokenId: tokenId,
    metadata: { ipAddress: input.ipAddress ?? null, userAgent: input.userAgent ?? null },
  });

  return { authSessionId, tokenId };
}

export async function revokeRefreshTokenById(input: {
  tokenId: string;
  reason: RefreshTokenRevokedReason;
}) {
  return revokeRefreshToken({
    id: input.tokenId,
    revokedReason: input.reason,
  });
}
