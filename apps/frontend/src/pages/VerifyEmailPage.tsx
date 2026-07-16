import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ActionTokenStateDto } from '@insightful-phish/shared';
import TokenVerificationPanel from '../components/auth/TokenVerificationPanel';
import type { TokenVerificationStatus } from '../components/auth/TokenVerificationPanel';
import { verifyEmail } from '../services/auth.service';

const pendingMessage = 'Verifying email address...';
const successMessage = 'Email verified. You can now log in.';
const usedMessage = 'This email verification link has already been used. You can log in.';
const missingTokenMessage =
  'This verification link is missing a token. Please request a new verification email.';
const invalidTokenMessage =
  'This verification link is invalid. Please request a new verification email.';
const expiredTokenMessage =
  'This verification link has expired. Please request a new verification email.';
const revokedTokenMessage =
  'This verification link is no longer valid. Please request a new verification email.';
const genericErrorMessage = 'We could not verify your email right now. Please try again later.';

function getVerificationStateMessage(state: ActionTokenStateDto): {
  status: TokenVerificationStatus;
  message: string;
} {
  if (state === 'VALID') return { status: 'success', message: successMessage };
  if (state === 'USED') return { status: 'success', message: usedMessage };
  if (state === 'EXPIRED') return { status: 'error', message: expiredTokenMessage };
  if (state === 'REVOKED') return { status: 'error', message: revokedTokenMessage };

  return { status: 'error', message: invalidTokenMessage };
}

function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<TokenVerificationStatus>('pending');
  const [message, setMessage] = useState(pendingMessage);

  const token = searchParams.get('token')?.trim() ?? '';

  useEffect(() => {
    let isMounted = true;

    async function verifyToken() {
      if (!token) {
        setStatus('error');
        setMessage(missingTokenMessage);
        return;
      }

      setStatus('pending');
      setMessage(pendingMessage);

      try {
        const result = await verifyEmail(token);
        if (!isMounted) return;

        const nextState = getVerificationStateMessage(result.state);
        setStatus(nextState.status);
        setMessage(nextState.message);
      } catch {
        if (!isMounted) return;
        setStatus('error');
        setMessage(genericErrorMessage);
      }
    }

    void verifyToken();

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <TokenVerificationPanel
      title="Verify Email"
      introMessage="Checking your email verification link."
      status={status}
      message={message}
      showLoginLink={status === 'success'}
    />
  );
}

export default VerifyEmailPage;
