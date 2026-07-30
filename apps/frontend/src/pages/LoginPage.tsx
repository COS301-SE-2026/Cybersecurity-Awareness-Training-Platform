import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AuthActionLink,
  AuthFormField,
  AuthPageFrame,
  AuthPageIntro,
} from '../components/auth/AuthPrimitives';
import { authFormStyle, authPrimaryButtonStyle } from '../components/auth/authStyles';
import { useAuth } from '../context/useAuth';
import BasicAlert from '../components/alerts/BasicAlert';
import { authLoginRequestSchema } from '@insightful-phish/shared';
import { ApiError } from '../lib/apiClient';
import { loginUser, resendVerification } from '../services/auth.service';
import { ROUTES } from '../constants/routes';
import GetStartedModal from '../components/landing-page/GetStartedModal';

function formatAlertMessage(message: string) {
  // makes everything title case and removes the . from the end of the message
  return message
    .replace(/\.$/, '')
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function normalizeRedirectPath(redirectTo?: string | null) {
  if (
    redirectTo &&
    (redirectTo.startsWith('/accept-invite') || redirectTo.startsWith('/setup/token/'))
  ) {
    return redirectTo;
  }
  if (redirectTo === '/trainee/campaigns' || redirectTo === ROUTES.CAMPAIGNS) {
    return ROUTES.CAMPAIGNS;
  }
  return ROUTES.CAMPAIGNS;
}

function getApiErrorCode(error: ApiError): string | null {
  const body = error.body;

  if (body && typeof body === 'object' && 'error' in body) {
    const errorCode = (body as { error?: unknown }).error;

    if (typeof errorCode === 'string') {
      return errorCode;
    }
  }

  return null;
}

function getLoginErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) {
    return 'Unable to connect to server.';
  }

  const errorCode = getApiErrorCode(error);

  if (
    error.status === 401 ||
    errorCode === 'AUTH_INVALID' ||
    errorCode === 'AUTH_REQUIRED' ||
    errorCode === 'TOKEN_REUSE_DETECTED'
  ) {
    return 'Invalid email address or password.';
  }

  if (errorCode === 'USER_EMAIL_NOT_VERIFIED') {
    return 'Email address must be verified before signing in.';
  }

  if (
    errorCode === 'USER_DISABLED' ||
    errorCode === 'ADMIN_DISABLED' ||
    errorCode === 'IP_ADMIN_DISABLED'
  ) {
    return 'This account is disabled. Please contact support.';
  }

  if (
    errorCode === 'ORGANISATION_SUSPENDED' ||
    errorCode === 'ORGANISATION_PENDING_ONBOARDING' ||
    errorCode === 'ORGANISATION_DISABLED' ||
    errorCode === 'ORGANISATION_ARCHIVED' ||
    errorCode === 'ORGANISATION_NOT_ACTIVE'
  ) {
    return 'Your organisation account is not active. Please contact your organisation administrator.';
  }

  if (error.status === 400 || error.status === 422 || errorCode === 'VALIDATION_ERROR') {
    return 'Please check your login details.';
  }

  if (error.status === 429 || errorCode === 'AUTH_RATE_LIMITED') {
    return 'Too many login attempts. Please try again later.';
  }

  if (error.status === 409) {
    return 'We could not complete sign in right now. Please try again.';
  }

  return 'Unable to sign in. Please try again.';
}

function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryRedirect = searchParams.get('redirectTo');

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const queryNotice = searchParams.get('notice');

  const [alertMessage, setAlertMessage] = useState(
    queryNotice === 'session_expired'
      ? 'Your session has expired or been revoked. Please log in again.'
      : '',
  );
  const [canResendVerification, setCanResendVerification] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [resendVerificationMessage, setResendVerificationMessage] = useState<string | null>(
    queryNotice === 'password_changed'
      ? 'Your password was changed successfully. Please log in with your new password.'
      : null,
  );
  const [resendVerificationError, setResendVerificationError] = useState<string | null>(null);
  const [resendVerificationEmail, setResendVerificationEmail] = useState<string | null>(null);

  useEffect(() => {
    if (
      isAuthenticated &&
      queryNotice !== 'password_changed' &&
      queryNotice !== 'session_expired'
    ) {
      navigate(normalizeRedirectPath(queryRedirect), { replace: true });
    }
  }, [isAuthenticated, navigate, queryRedirect, queryNotice]);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setAlertMessage('');
    setCanResendVerification(false);
    setResendVerificationMessage(null);
    setResendVerificationError(null);
    setResendVerificationEmail(null);
    setIsLoading(true);
    const validationResult = authLoginRequestSchema.safeParse({
      email,
      password,
      rememberMe,
    });

    if (!validationResult.success) {
      const issue = validationResult.error.issues[0];

      if (issue?.path.includes('email') || issue?.path.includes('password')) {
        setAlertMessage(formatAlertMessage(issue.message));
      }
      setIsLoading(false);
      return;
    }

    try {
      const authResponse = await loginUser(validationResult.data);

      setResendVerificationEmail(null);
      login(authResponse);
      const targetRedirect = queryRedirect || authResponse.redirectTo;
      navigate(normalizeRedirectPath(targetRedirect));
    } catch (error) {
      setAlertMessage(getLoginErrorMessage(error));

      const isEmailNotVerified =
        error instanceof ApiError && getApiErrorCode(error) === 'USER_EMAIL_NOT_VERIFIED';

      setCanResendVerification(isEmailNotVerified);
      setResendVerificationEmail(isEmailNotVerified ? validationResult.data.email : null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResendVerification() {
    if (!resendVerificationEmail) {
      return;
    }

    setIsResendingVerification(true);
    setResendVerificationMessage(null);
    setResendVerificationError(null);

    try {
      await resendVerification({ email: resendVerificationEmail });

      setResendVerificationMessage(
        'If the email is registered and unverified, a verification link has been sent.',
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        setResendVerificationError('Please wait before requesting another verification email.');
      } else {
        setResendVerificationError(
          'We could not send a verification email right now. Please try again later.',
        );
      }
    } finally {
      setIsResendingVerification(false);
    }
  }

  return (
    <>
      <AuthPageFrame
        leftWidth="50%"
        rightWidth="50%"
        rightPanelStyle={{
          justifyContent: 'flex-end',
          paddingRight: '6vw',
        }}
        leftChildren={
          <>
            <AuthPageIntro
              title="Welcome Back"
              logo={
                <img
                  src="/logo.png"
                  alt="Insightful Phish Logo"
                  style={{
                    width: '200px',
                    marginBottom: '2rem',
                    marginLeft: '-12px',
                  }}
                />
              }
              dividerStyle={{ marginBottom: '2rem' }}
              messageStyle={{ marginBottom: '1rem' }}
            />

            {alertMessage && (
              <BasicAlert variant="danger" onClose={() => setAlertMessage('')}>
                {alertMessage}
              </BasicAlert>
            )}

            {canResendVerification && resendVerificationEmail ? (
              <div style={{ marginBottom: '1rem' }}>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={isResendingVerification}
                  style={{
                    background: 'transparent',
                    border: 0,
                    color: '#cca7ff',
                    cursor: isResendingVerification ? 'not-allowed' : 'pointer',
                    fontFamily: 'Jost',
                    fontSize: '1.2rem',
                    letterSpacing: '0.04em',
                    opacity: isResendingVerification ? 0.6 : 1,
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  {isResendingVerification ? 'Sending...' : 'Resend verification email'}
                </button>

                {resendVerificationMessage ? (
                  <p style={{ color: '#86efac', fontFamily: 'Overpass', fontSize: '1rem' }}>
                    {resendVerificationMessage}
                  </p>
                ) : null}

                {resendVerificationError ? (
                  <p style={{ color: '#fca5a5', fontFamily: 'Overpass', fontSize: '1rem' }}>
                    {resendVerificationError}
                  </p>
                ) : null}
              </div>
            ) : null}

            <form onSubmit={handleLogin} noValidate style={authFormStyle}>
              <AuthFormField
                label="Email Address"
                type="email"
                value={email}
                disabled={isLoading}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                wrapperStyle={{ marginBottom: '1.5rem' }}
                inputStyle={{ height: '52px' }}
              />

              <AuthFormField
                label="Password"
                disabled={isLoading}
                rightLabel={
                  <Link
                    to="/forgot-password"
                    style={{
                      color: '#cca7ff',
                      fontFamily: 'Jost',
                      fontWeight: 400,
                      letterSpacing: '0.05em',
                      fontSize: '1.4rem',
                      textDecoration: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Forgot Password?
                  </Link>
                }
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                wrapperStyle={{ marginBottom: '2rem' }}
                inputStyle={{ height: '52px' }}
              />

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  ...authPrimaryButtonStyle,
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  height: '56px',
                  fontSize: '1.7rem',
                  marginBottom: '1rem',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                {isLoading && (
                  <svg
                    aria-hidden="true"
                    className="mr-1 h-6 w-6 animate-spin fill-white text-white/30"
                    viewBox="0 0 100 101"
                    fill="none"
                  >
                    <path
                      d="M100 50.6C100 78.2 77.6 100.6 50 100.6C22.4 100.6 0 78.2 0 50.6C0 23 22.4 0.6 50 0.6C77.6 0.6 100 23 100 50.6Z"
                      fill="currentColor"
                    />
                    <path
                      d="M93.97 39.04C96.39 38.4 97.86 35.91 97.01 33.55C95.29 28.82 92.87 24.37 89.82 20.35C85.84 15.12 80.88 10.72 75.21 7.41C69.54 4.1 63.27 1.94 56.77 1.05C51.77 0.37 46.7 0.45 41.73 1.28C39.26 1.69 37.81 4.2 38.45 6.62C39.08 9.04 41.57 10.47 44.05 10.11C47.85 9.56 51.72 9.53 55.54 10.23C60.86 11 65.99 12.78 70.63 15.47C75.27 18.16 79.33 21.7 82.58 25.84C84.91 28.81 86.8 32.13 88.18 35.68C89.08 38.01 91.54 39.68 93.97 39.04Z"
                      fill="currentFill"
                    />
                  </svg>
                )}

                <span>{isLoading ? 'Logging In...' : 'Log In'}</span>
              </button>

              {/* REMEMBER ME CHECKBOX */}
              {/* INTEGRATION: Please handle Organisation Policy for Remember Me checkbox */}
              <div className="flex items-center mb-2">
                <input
                  id="default-checkbox"
                  type="checkbox"
                  checked={rememberMe}
                  disabled={isLoading}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="accent-[#8400ff] w-5 h-5 border border-default-medium bg-neutral-secondary-medium focus:ring-2 focus:ring-brand-soft"
                />
                <label
                  htmlFor="default-checkbox"
                  className="select-none ms-2 text-[1.4rem] font-jost text-[#b37dff] tracking-wide font-regular"
                >
                  Remember Me
                </label>
              </div>

              <AuthActionLink
                to="/register"
                prefix="NEW?"
                onClick={(event) => {
                  event.preventDefault();
                  console.log('CLICKED');
                  setIsRegisterModalOpen(true);
                }}
                emphasis="Register an Account"
                rowStyle={{
                  gap: '0.4rem',
                  cursor: 'pointer',
                }}
              />
            </form>
          </>
        }
        rightChildren={
          <h2
            style={{
              margin: 0,
              fontFamily: 'Jost',
              fontWeight: 400,
              fontSize: '9rem',
              letterSpacing: '0.02em',
              lineHeight: 1.1,
              textAlign: 'right',
              color: '#8400ff',
            }}
          >
            DON&apos;T
            <br />
            TAKE
            <br />
            THE
            <br />
            BAIT.
          </h2>
        }
      />

      <GetStartedModal isOpen={isRegisterModalOpen} onClose={() => setIsRegisterModalOpen(false)} />
    </>
  );
}

export default LoginPage;
