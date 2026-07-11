export const RESEND_COOLDOWN_SECONDS = 60;
const RESEND_COOLDOWN_MS = RESEND_COOLDOWN_SECONDS * 1000;
export function calculateResendCooldownSeconds(
  lastEventAt: Date | number,
  now = Date.now(),
): number {
  const lastEventTimestamp = lastEventAt instanceof Date ? lastEventAt.getTime() : lastEventAt;
  const remainingMs = RESEND_COOLDOWN_MS - (now - lastEventTimestamp);
  if (remainingMs <= 0) return 0;
  return Math.max(1, Math.ceil(remainingMs / 1000));
}
