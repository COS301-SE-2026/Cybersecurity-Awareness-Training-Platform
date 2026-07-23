import { z } from 'zod';

export const DEFAULT_SUPPORT_EMAIL_ADDRESS = 'support@insightfulphish.co.za';

const SUPPORT_MAILBOX_PATTERN =
  /^[A-Za-z0-9.!#$%*+\-/^_`{|}~]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

function hasHeaderControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 31 || codePoint === 127;
  });
}

export function isSupportEmailAddress(value: string): boolean {
  return !hasHeaderControlCharacter(value) && SUPPORT_MAILBOX_PATTERN.test(value);
}

export const supportEmailAddressSchema = z
  .string()
  .refine(isSupportEmailAddress, 'Invalid support email address')
  .default(DEFAULT_SUPPORT_EMAIL_ADDRESS);
