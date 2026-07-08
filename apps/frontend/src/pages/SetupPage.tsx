import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { SetupTokenContextResponseDto } from '@insightful-phish/shared';
import BasicAlert from '../components/alerts/BasicAlert';
import { AuthFormField, AuthPageFrame, AuthPageIntro } from '../components/auth/AuthPrimitives';
import {
  authFieldRowStyle,
  authFormStyle,
  authPrimaryButtonStyle,
} from '../components/auth/authStyles';
import { ApiError } from '../lib/apiClient';
import { completeSetupWithToken, getSetupTokenContext } from '../services/auth.service';

const invalidTokenMessage = 'This setup link is invalid. Please request a new invitation.';
const expiredTokenMessage = 'This setup link has expired. Please request a new invitation.';
const usedTokenMessage = 'This setup link has already been used. Please log in instead.';
const suspendedOrganisationMessage =
  'This organisation is not currently accepting setup requests. Please contact support.';
const roleConflictMessage =
  'This invitation cannot be completed because the account already has a conflicting role.';
const passwordPolicyMessage = 'Please choose a password that meets the password requirements.';
const rateLimitMessage = 'Too many attempts. Please wait a moment and try again.';
const genericErrorMessage = 'Something went wrong. Please try again.';

function validateSetupForm(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}) {
  const data = {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: input.email.trim().toLowerCase(),
    password: input.password,
    confirmPassword: input.confirmPassword,
  };

  if (!data.firstName) return { success: false as const, message: 'PLease Enter A First Name ' };
  if (!data.lastName) return { success: false as const, message: 'PLease Enter A Last Name ' };
  if (!data.email) return { success: false as const, message: invalidTokenMessage };
  if (
    data.password.length < 12 ||
    data.password.length > 128 ||
    !/[a-z]/.test(data.password) ||
    !/[A-Z]/.test(data.password) ||
    !/\d/.test(data.password) ||
    !/[^\sA-Za-z0-9]/.test(data.password)
  ) {
    return { success: false as const, message: passwordPolicyMessage };
  }
  if (!data.confirmPassword) {
    return { success: false as const, message: 'Please Confrim Your Password' };
  }
  if (data.password !== data.confirmPassword) {
    return { success: false as const, message: 'Password Conrimation Must Match Password' };
  }

  return { success: true as const, data };
}

function getSetupErrorCode(error: ApiError): string | null {
  const body = error.body;

  if (body && typeof body === 'object' && 'error' in body) {
    const code = (body as { error?: unknown }).error;
    return typeof code === 'string' ? code : null;
  }
  return null;
}

function getSetupErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return genericErrorMessage;

  const errorCode = getSetupErrorCode(error);

  if (errorCode === 'SETUP_TOKEN_EXPIRED') return expiredTokenMessage;
  if (errorCode === 'SETUP_TOKEN_USED') return usedTokenMessage;
  if (errorCode === 'SETUP_ROLE_CONFLICT') return roleConflictMessage;
  if (errorCode?.startsWith('ORGANISATION')) return suspendedOrganisationMessage;
  if (error.status === 401) return invalidTokenMessage;
  if (error.status === 403) return suspendedOrganisationMessage;
  if (error.status === 404) return invalidTokenMessage;
  if (error.status === 409) return roleConflictMessage;
  if (error.status === 422) return passwordPolicyMessage;
  if (error.status === 429) return rateLimitMessage;

  return genericErrorMessage;
}

function tokenStateMessafe(state?: string) {
  if (state === 'EXPIRED') return expiredTokenMessage;
  if (state === 'USED') return usedTokenMessage;
  if (state === 'REVOKED' || state === 'INVALID') return invalidTokenMessage;
  return genericErrorMessage;
}

function roleLabel(role?: string) {
  if (role === 'ORGANISATION_ADMIN') return 'Organisation Admin';
  if (role == 'ORGANISATION_TRAINEE') return 'Organisation Trainee';
  if (role === 'IP_ADMIN') return 'Platform Admin';
  return 'Invited User';
}

function SetupPage() {
  const { token } = useParams<{ token: string }>();
  const [context, setContext] = useState<SetupTokenContextResponseDto | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'danger'>('danger');
  const [isLoadingContext, setIsLoadingContext] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const email = context?.targetEmail ?? '';
  const isBusy = isLoadingContext || isSubmitting;
  const contextMessage = useMemo(() => {
    if (!context) return null;
    const role = roleLabel(context.role);
    return context.organisationName ? `${role} for ${context.organisationName}` : role;
  }, [context]);

  useEffect(() => {
    let isMounted = true;

    async function loadContext() {
      if (!token) {
        setAlertType('danger');
        setAlertMessage(invalidTokenMessage);
        setIsLoadingContext(false);
        return;
      }

      try {
        const data = await getSetupTokenContext(token);
        if (!isMounted) return;

        setContext(data);

        if (data.token.state !== 'VALID') {
          setAlertType('danger');
          setAlertMessage(tokenStateMessafe(data.token.state));
          return;
        }

        setFirstName(data.targetFirstName ?? '');
        setLastName(data.targetLastName ?? '');
      } catch (error) {
        if (!isMounted) return;
        setAlertMessage(getSetupErrorMessage(error));
      } finally {
        if (!isMounted) setIsLoadingContext(false);
      }
    }

    void loadContext();

    return () => {
      isMounted = false;
    };
  }, [token]);

  async function handleCompleteSetup(event: FormEvent) {
    event.preventDefault();
    setAlertMessage('');

    const validationResult = validateSetupForm({
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
    });

    if (!validationResult.success) {
      setAlertType('danger');
      setAlertMessage(validationResult.message);
      return;
    }

    if (!token || context?.token.state !== 'VALID') {
      setAlertType('danger');
      setAlertMessage(invalidTokenMessage);
      return;
    }

    const { confirmPassword: _confirmPassword, email: _email, ...payload } = validationResult.data;
    void _confirmPassword;
    void _email;

    try {
      setIsSubmitting(true);
      await completeSetupWithToken(token, payload);
      setAlertType('success');
      setAlertMessage('Setup complete. you can now log in.');
      setIsComplete(true);
    } catch (error) {
      setAlertType('danger');
      setAlertMessage(getSetupErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthPageFrame
      leftWidth="78%"
      rightWidth="22%"
      rightPanelStyle={{ padding: '2rem' }}
      leftChildren={
        <>
          <AuthPageIntro
            title="Complete Setup"
            message={contextMessage}
            dividerStyle={{ marginBottom: '1rem' }}
            messageStyle={{ marginBottom: '1rem' }}
          />

          {alertMessage && (
            <BasicAlert variant={alertType} onClose={() => setAlertMessage('')}>
              {alertMessage}
            </BasicAlert>
          )}

          {isLoadingContext ? (
            <p style={{ color: 'white', fontFamily: 'Overpass' }}>Loading setup link...</p>
          ) : isComplete ? (
            <Link to="/login" style={{ color: '#cca7ff', fontFamily: 'Jost', fontSize: '1.3rem' }}>
              Go to login
            </Link>
          ) : context?.token.state === 'VALID' ? (
            <form onSubmit={handleCompleteSetup} noValidate style={authFormStyle}>
              <div style={{ ...authFieldRowStyle, marginBottom: '1.8rem' }}>
                <AuthFormField
                  label="First Name(s)"
                  type="text"
                  disabled={isBusy}
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  autoComplete="given-name"
                  wrapperStyle={{ flex: 1 }}
                />
                <AuthFormField
                  label="Last Name"
                  type="text"
                  value={lastName}
                  disabled={isBusy}
                  onChange={(event) => setLastName(event.target.value)}
                  autoComplete="family-name"
                  wrapperStyle={{ flex: 1 }}
                />
              </div>

              <AuthFormField
                label="Email Address"
                type="email"
                value={email}
                disabled
                onChange={() => {}}
                autoComplete="email"
                wrapperStyle={{ marginBottom: '1.8rem' }}
              />

              <div style={{ ...authFieldRowStyle, marginBottom: '2.5rem' }}>
                <AuthFormField
                  label="Password"
                  type="password"
                  value={password}
                  disabled={isBusy}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  wrapperStyle={{ flex: 1 }}
                />
                <AuthFormField
                  label="Confirm Password"
                  type="password"
                  value={confirmPassword}
                  disabled={isBusy}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  wrapperStyle={{ flex: 1 }}
                />
              </div>

              <button
                type="submit"
                disabled={isBusy}
                style={{
                  ...authPrimaryButtonStyle,
                  width: '48%',
                  height: '60px',
                  fontSize: '1.7rem',
                  cursor: isBusy ? 'not-allowed' : 'pointer',
                  opacity: isBusy ? 0.6 : 1,
                }}
              >
                {isSubmitting ? 'Completing Setup...' : 'Complete Setup'}
              </button>
            </form>
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

export default SetupPage;
