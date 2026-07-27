import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import TokenVerificationPanel from '../components/auth/TokenVerificationPanel';
import { getTokenContext, resendToken, verifyEmail } from '../services/auth.service';
import { useTokenVerificationFlow } from '../hooks/useTokenVerificationFlow';
import type { TokenVerificationMessages } from '../hooks/useTokenVerificationFlow';

const messages = {
  pending: 'Checking your email verification link.',
  success: 'Email verified. You can now log in.',
  used: 'This email verification link has already been used. You can log in.',
  missingToken:
    'This verification link is missing a token. Please request a new verification email.',
  invalid: 'This verification link is invalid. Please request a new verification email.',
  expired: 'This verification link has expired. Please request a new verification email.',
  revoked: 'This verification link is no longer valid. Please request a new verification email.',
  generic: 'We could not verify your email right now. Please try again later.',
  resendSuccess: 'If the email is still eligible, a new verification link has been sent.',
  resendGeneric: 'We could not send a new verification link right now. Please try again later.',
  resendIneligible:
    'This verification link cannot be resent. Please request a new verification email.',
  resendCooldown: (seconds: number) =>
    seconds > 0
      ? `Please wait ${seconds} seconds before requesting another verification link.`
      : 'Please wait before requesting another verification link.',
} satisfies TokenVerificationMessages;

function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token')?.trim() ?? '', [searchParams]);

  const verification = useTokenVerificationFlow({
    token,
    expectedFlow: 'EMAIL_VERIFICATION',
    messages,
    verifyToken: verifyEmail,
    getTokenContext,
    resendToken,
  });

  return (
    <TokenVerificationPanel
      title="Verify Email"
      status={verification.status}
      message={verification.message}
      showLoginLink={verification.status === 'success'}
      canResend={verification.canResend}
      isResending={verification.isResending}
      resendCooldownSeconds={verification.resendCooldownSeconds}
      resendButtonLabel="Resend verification link"
      resendSendingLabel="Sending verification link..."
      resendFeedbackMessage={verification.resendFeedbackMessage}
      resendFeedbackStatus={verification.resendFeedbackStatus}
      onResend={verification.handleResend}
    />
  );
}

export default VerifyEmailPage;
