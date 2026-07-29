import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import TokenVerificationPanel from '../components/auth/TokenVerificationPanel';
import { getTokenContext, resendToken, verifyEmailChange } from '../services/auth.service';
import { useTokenVerificationFlow } from '../hooks/useTokenVerificationFlow';
import type { TokenVerificationMessages } from '../hooks/useTokenVerificationFlow';
import { ApiError } from '../lib/apiClient';
import { useAuth } from '../context/useAuth';

function getEmailChangeVerificationErrorMessage(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null;

  const body = error.body;
  if (!body || typeof body !== 'object' || !('error' in body)) return null;

  return (body as { error?: unknown }).error === 'AUTH_EMAIL_EXISTS'
    ? 'This email address is already in use. Please restart the email-change process.'
    : null;
}

const messages = {
  pending: 'Checking your email change confirmation link.',
  success: 'Email change confirmed. Please sign in again using your new email address.',
  used: 'This email change link has already been used.',
  missingToken: 'This email change link is missing a token. Please request a new link.',
  invalid: 'This email change link is invalid. Please request a new link.',
  expired: 'This email change link has expired. Please request a new link.',
  revoked: 'This email change link is no longer valid. Please request a new link.',
  generic: 'We could not confirm your email change right now. Please try again later.',
  resendSuccess: 'If the email change is still eligible, a new confirmation link has been sent.',
  resendGeneric: 'We could not send a new email change link right now. Please try again later.',
  resendIneligible: 'This email change link cannot be resent. Please request a new link.',
  resendCooldown: (seconds: number) =>
    seconds > 0
      ? `Please wait ${seconds} seconds before requesting another email change link.`
      : 'Please wait before requesting another email change link.',
} satisfies TokenVerificationMessages;

function ConfirmEmailChangePage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token')?.trim() ?? '', [searchParams]);
  const { clearAuth } = useAuth();

  const verification = useTokenVerificationFlow({
    token,
    expectedFlow: 'EMAIL_CHANGE_VERIFICATION',
    messages,
    verifyToken: verifyEmailChange,
    getTokenContext,
    resendToken,
    getVerificationErrorMessage: getEmailChangeVerificationErrorMessage,
    onVerified: clearAuth,
  });

  return (
    <TokenVerificationPanel
      title="Confirm Email Change"
      status={verification.status}
      message={verification.message}
      showLoginLink={verification.status === 'success'}
      canResend={verification.canResend}
      isResending={verification.isResending}
      resendCooldownSeconds={verification.resendCooldownSeconds}
      resendButtonLabel="Resend email change link"
      resendSendingLabel="Sending email change link..."
      resendFeedbackMessage={verification.resendFeedbackMessage}
      resendFeedbackStatus={verification.resendFeedbackStatus}
      onResend={verification.handleResend}
    />
  );
}

export default ConfirmEmailChangePage;
