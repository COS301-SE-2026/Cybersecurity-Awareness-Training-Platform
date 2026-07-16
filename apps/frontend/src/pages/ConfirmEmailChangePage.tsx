import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ActionTokenStateDto } from '@insightful-phish/shared';
import TokenVerificationPanel from '../components/auth/TokenVerificationPanel';
import type { TokenVerificationStatus } from '../components/auth/TokenVerificationPanel';
import { verifyEmailChange } from '../services/auth.service';

const pendingMessage = 'Confirming email change...';
const successMessage = 'Email change confirmed.';
const usedMessage = 'This email change link has already been used.';
const missingTokenMessage = 'This email change link is missing a token. Please request a new link.';
const invalidTokenMessage = 'This email change link is invalid. Please request a new link.';
const expiredTokenMessage = 'This email change link has expired. Please request a new link.';
const revokedTokenMessage = 'This email change link is no longer valid. Please request a new link.';
const genericErrorMessage =
  'We could not confirm your email change right now. Please try again later.';

function getEmailChangeStateMessage(state: ActionTokenStateDto): {
  status: TokenVerificationStatus;
  message: string;
} {
  if (state === 'VALID') return { status: 'success', message: successMessage };
  if (state === 'USED') return { status: 'success', message: usedMessage };
  if (state === 'EXPIRED') return { status: 'error', message: expiredTokenMessage };
  if (state === 'REVOKED') return { status: 'error', message: revokedTokenMessage };

  return { status: 'error', message: invalidTokenMessage };
}

function ConfirmEmailChangePage() {
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
        const result = await verifyEmailChange(token);
        if (!isMounted) return;

        const nextState = getEmailChangeStateMessage(result.state);
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
      title="Confirm Email Change"
      introMessage="Checking your email change confirmation link."
      status={status}
      message={message}
    />
  );
}

export default ConfirmEmailChangePage;
