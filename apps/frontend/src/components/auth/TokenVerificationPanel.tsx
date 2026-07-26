import { Link } from 'react-router-dom';
import BasicAlert from '../alerts/BasicAlert';
import { AuthPageFrame, AuthPageIntro } from './AuthPrimitives';

export type TokenVerificationStatus = 'pending' | 'success' | 'error';

type TokenVerificationPanelProps = Readonly<{
  title: string;
  introMessage: string;
  status: TokenVerificationStatus;
  message: string;
  showLoginLink?: boolean;
  canResend?: boolean;
  isResending?: boolean;
  resendCooldownSeconds?: number;
  resendButtonLabel?: string;
  resendSendingLabel?: string;
  resendFeedbackMessage?: string | null;
  resendFeedbackStatus?: 'success' | 'error';
  onResend?: () => void;
}>;

function TokenVerificationPanel({
  title,
  introMessage,
  status,
  message,
  showLoginLink = false,
  canResend = false,
  isResending = false,
  resendCooldownSeconds = 0,
  resendButtonLabel = 'Resend verification link',
  resendSendingLabel = 'Sending...',
  resendFeedbackMessage,
  resendFeedbackStatus = 'success',
  onResend,
}: TokenVerificationPanelProps) {
  const alertVariant = status === 'success' ? 'success' : 'danger';
  const isResendDisabled = isResending || resendCooldownSeconds > 0;
  const resendButtonText = isResending
    ? resendSendingLabel
    : resendCooldownSeconds > 0
      ? `${resendButtonLabel} (${resendCooldownSeconds}s)`
      : resendButtonLabel;

  return (
    <AuthPageFrame
      leftWidth="78%"
      rightWidth="22%"
      rightPanelStyle={{ padding: '2rem' }}
      leftChildren={
        <>
          <AuthPageIntro
            title={title}
            message={introMessage}
            dividerStyle={{ marginBottom: '1rem' }}
            messageStyle={{ marginBottom: '1rem' }}
          />

          {status === 'pending' ? (
            <p style={{ color: 'white', fontFamily: 'Overpass' }}>{message}</p>
          ) : message ? (
            <BasicAlert variant={alertVariant}>{message}</BasicAlert>
          ) : null}

          {status === 'success' && showLoginLink ? (
            <Link to="/login" style={{ color: '#cca7ff', fontFamily: 'Jost', fontSize: '1.3rem' }}>
              Go to login
            </Link>
          ) : null}

          {canResend || resendFeedbackMessage ? (
            <div style={{ marginTop: '1rem' }}>
              {canResend ? (
                <button
                  type="button"
                  onClick={onResend}
                  disabled={isResendDisabled}
                  aria-busy={isResending}
                  style={{
                    background: 'transparent',
                    border: 0,
                    color: '#cca7ff',
                    cursor: isResendDisabled ? 'not-allowed' : 'pointer',
                    fontFamily: 'Jost',
                    fontSize: '1.2rem',
                    letterSpacing: '0.04em',
                    opacity: isResendDisabled ? 0.6 : 1,
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  {resendButtonText}
                </button>
              ) : null}

              {resendFeedbackMessage ? (
                <p
                  role={resendFeedbackStatus === 'error' ? 'alert' : 'status'}
                  aria-live="polite"
                  style={{
                    color: resendFeedbackStatus === 'success' ? '#86efac' : '#fca5a5',
                    fontFamily: 'Overpass',
                    fontSize: '1rem',
                  }}
                >
                  {resendFeedbackMessage}
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      }
      rightChildren={
        <img
          src="/logo-motto.png"
          alt="Insightful Phish Logo"
          style={{ width: '100%', maxWidth: '300px' }}
        />
      }
    />
  );
}

export default TokenVerificationPanel;
