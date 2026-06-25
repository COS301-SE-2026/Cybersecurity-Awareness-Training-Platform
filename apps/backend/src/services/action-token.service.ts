import type { ActionTokenPurpose } from '../generated/prisma/enums.js';
import type { ActionTokenModel } from '../generated/prisma/models/ActionToken.js';
import {
  createActionToken,
  findActionTokenByHash,
  markActionTokenUsed,
  revokeActionToken,
  type CreateActionTokenInput,
  withClaimedActionToken,
} from '../repositories/action-token.repository.js';
import { generateOpaqueToken, hashOpaqueToken } from './token-hash.service.js';
import type { Prisma } from '../generated/prisma/client.js';

export type ActionTokenState =
  | 'VALID'
  | 'INVALID'
  | 'EXPIRED'
  | 'USED'
  | 'REVOKED'
  | 'WRONG_PURPOSE';

export type IssueActionTokenInput = Omit<CreateActionTokenInput, 'tokenHash'>;

export type IssueActionTokenResult = {
  rawToken: string;
  token: ActionTokenModel;
};

export type ValidateActionTokenResult =
  | { state: 'VALID'; token: ActionTokenModel }
  | { state: Exclude<ActionTokenState, 'VALID'>; token?: ActionTokenModel };

export async function issueActionToken(
  input: IssueActionTokenInput,
): Promise<IssueActionTokenResult> {
  const rawToken = generateOpaqueToken();
  const tokenHash = hashOpaqueToken(rawToken);
  const token = await createActionToken({
    ...input,
    tokenHash,
  });

  return { rawToken, token };
}

export async function validateActionToken(input: {
  rawToken: string;
  expectedPurpose: ActionTokenPurpose;
  now?: Date;
}): Promise<ValidateActionTokenResult> {
  const tokenHash = hashOpaqueToken(input.rawToken);
  const token = await findActionTokenByHash(tokenHash);

  if (!token) {
    return { state: 'INVALID' };
  }

  if (token.purpose !== input.expectedPurpose) {
    return { state: 'WRONG_PURPOSE', token };
  }

  if (token.revokedAt) {
    return { state: 'REVOKED', token };
  }

  if (token.usedAt) {
    return { state: 'USED', token };
  }

  const now = input.now ?? new Date();

  if (token.expiresAt.getTime() <= now.getTime()) {
    return { state: 'EXPIRED', token };
  }

  return {
    state: 'VALID',
    token,
  };
}

// Only call after intended action succeeds.
export type ConsumeActionTokenResult =
  | { consumed: true }
  | { consumed: false; state: 'USED_OR_REVOKED' };

export async function consumeActionToken(input: {
  tokenId: string;
}): Promise<ConsumeActionTokenResult> {
  const consumed = await markActionTokenUsed(input.tokenId);

  if (!consumed) {
    return { consumed: false, state: 'USED_OR_REVOKED' };
  }

  return { consumed: true };
}

export async function revokeActionTokenById(input: { tokenId: string; reason: string }) {
  return revokeActionToken({ id: input.tokenId, revokedReason: input.reason });
}
export function runWithConsumedActionToken<T>(
  input: { tokenId: string },
  action: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  return withClaimedActionToken(input, action);
}
