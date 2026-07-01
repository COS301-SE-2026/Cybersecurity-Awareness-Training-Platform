import { useState } from 'react';
import type { FormEvent } from 'react';
import BasicAlert from '../components/alerts/BasicAlert';
import { Popover } from 'flowbite-react';
import EmailVerificationModal from '../components/layout/modals/EmailVerificationModal';

import {
  AuthActionLink,
  AuthFormField,
  AuthPageFrame,
  AuthPageIntro,
} from '../components/auth/AuthPrimitives';
import {
  authFieldRowStyle,
  authFormStyle,
  authPrimaryButtonStyle,
} from '../components/auth/authStyles';
import { authRegisterRequestSchema } from '@insightful-phish/shared';

function formatAlertMessage(message: string) {
  // makes everything title case and removes the . from the end of the message
  return message
    .replace(/\.$/, '')
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function RegisterPage() {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'danger'>('danger');
  const [showEmailVerificationModal, setShowEmailVerificationModal] = useState(false);

  async function handleRegister(event: FormEvent) {
    event.preventDefault();
    setAlertMessage('');

    const validationResult = authRegisterRequestSchema.safeParse({
      firstName,
      lastName,
      email,
      password,
    });

    if (!validationResult.success) {
      setAlertType('danger');
      setAlertMessage(
        formatAlertMessage(validationResult.error.issues[0]?.message) || 'Invalid Input',
      );
      return;
    }

    if (password !== confirmPassword) {
      setAlertType('danger');
      setAlertMessage('Passwords Do Not Match');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validationResult.data),
      });

      const data = await response.json();

      if (!response.ok) {
        setAlertType('danger');
        setAlertMessage(formatAlertMessage(data.message) || 'Registration Failed');
        return;
      }

      setShowEmailVerificationModal(true);
    } catch {
      setAlertType('danger');
      setAlertMessage('Unable To Connect To The Server');
    } finally {
      setIsLoading(false);
    }
  }

  const passwordPolicyPopover = (
    <div className="w-100 bg-faint-purple shadow-lg">
      <div className="bg-gray-100 bg-light-purple px-3 py-2">
        <h3 className="font-semibold font-jost text-[1.4rem] text-purple tracking-wider">
          Password Requirements
        </h3>
      </div>

      <div className="px-3 py-2">
        <p className="text-sm font-overpass font-medium text-[1.05rem] text-dark-pink">
          ● At Least 12 Characters
        </p>
        <p className="text-sm font-overpass font-medium text-[1.05rem] text-dark-pink">
          ● At Most 128 Characters
        </p>
        <p className="text-sm font-overpass font-medium text-[1.05rem] text-dark-pink">
          ● At Least ONE Uppercase Letter (A–Z)
        </p>
        <p className="text-sm font-overpass font-medium text-[1.05rem] text-dark-pink">
          ● At Least ONE Lowercase Letter (a–z)
        </p>
        <p className="text-sm font-overpass font-medium text-[1.05rem] text-dark-pink">
          ● At Least ONE Number (0–9)
        </p>
        <p className="text-sm font-overpass font-medium text-[1.05rem] text-dark-pink">
          ● At Least ONE Special Character (e.g. ! @ # $ %)
        </p>
      </div>
    </div>
  );

  return (
    <AuthPageFrame
      leftWidth="78%"
      rightWidth="22%"
      rightPanelStyle={{ padding: '2rem' }}
      leftChildren={
        <>
          <AuthPageIntro
            title="Get Started"
            dividerStyle={{ marginBottom: '0.9rem' }}
            afterDivider={
              <AuthActionLink
                // THIS NEEDS TO GO TO THE ORGANISATION REGISTRATION REQUEST
                to="/register"
                prefix="ORGANISATION?"
                emphasis="Get Started as an Organisation"
                outerStyle={{ marginBottom: '1.5rem' }}
              />
            }
          />

          {alertMessage && (
            <BasicAlert variant={alertType} onClose={() => setAlertMessage('')}>
              {alertMessage}
            </BasicAlert>
          )}

          <EmailVerificationModal
            isOpen={showEmailVerificationModal}
            email={email}
            accountDescription="Individual Trainee"
            onResend={() => {}}
          />

          <form onSubmit={handleRegister} noValidate style={authFormStyle}>
            <div
              style={{
                ...authFieldRowStyle,
                marginBottom: '1.8rem',
              }}
            >
              <AuthFormField
                label="First Name(s)"
                type="text"
                disabled={isLoading}
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                autoComplete="given-name"
                wrapperStyle={{ flex: 1 }}
              />

              <AuthFormField
                label="Last Name"
                type="text"
                value={lastName}
                disabled={isLoading}
                onChange={(event) => setLastName(event.target.value)}
                autoComplete="family-name"
                wrapperStyle={{ flex: 1 }}
              />
            </div>

            <AuthFormField
              label="Email Address"
              type="email"
              value={email}
              disabled={isLoading}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              wrapperStyle={{ marginBottom: '1.8rem' }}
            />

            <div
              style={{
                ...authFieldRowStyle,
                marginBottom: '2.5rem',
              }}
            >
              <AuthFormField
                label="Password"
                type="password"
                value={password}
                disabled={isLoading}
                rightLabel={
                  <Popover
                    content={passwordPolicyPopover}
                    arrow={false}
                    theme={{
                      base: 'rounded-none bg-transparent border-0 shadow-xl absolute z-20 inline-block w-max max-w-[100vw] outline-none',
                      content: 'relative overflow-hidden rounded-none',
                    }}
                  >
                    <span
                      className="material-icons-outlined cursor-pointer text-light-pink"
                      style={{ fontSize: '2rem' }}
                    >
                      info
                    </span>
                  </Popover>
                }
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                wrapperStyle={{ flex: 1 }}
              />

              <AuthFormField
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                disabled={isLoading}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                wrapperStyle={{ flex: 1 }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2.5rem',
              }}
            >
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  ...authPrimaryButtonStyle,
                  width: '48%',
                  height: '60px',
                  fontSize: '1.7rem',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isLoading && (
                  <svg
                    aria-hidden="true"
                    className="mr-3 h-6 w-6 animate-spin fill-white text-white/30"
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

                {isLoading ? 'Creating Account...' : 'Register'}
              </button>

              <AuthActionLink to="/login" prefix="ALREADY REGISTERED?" emphasis="Log In" />
            </div>
          </form>
        </>
      }
      rightChildren={
        <img
          src="/logo-motto.png"
          alt="Insightful Phish Logo"
          style={{
            width: '100%',
            maxWidth: '300px',
          }}
        />
      }
    />
  );
}

export default RegisterPage;
