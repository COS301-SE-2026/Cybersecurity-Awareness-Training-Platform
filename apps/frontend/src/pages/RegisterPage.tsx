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
  authLightFieldInputStyle,
  authLightFieldLabelStyle,
  authLightTitleStyle,
  authPrimaryButtonStyle,
  authResponsiveActionRowStyle,
  authResponsiveFieldRowStyle,
} from '../components/auth/authStyles';
import { ApiError } from '../lib/apiClient';
import { registerUser, resendVerification } from '../services/auth.service';

const duplicateEmailMessage =
  'An account may already exist for this email. Please log in or request a new verification email.';
const pendingVerificationMessage =
  'Please check your email to verify your account. You can request a new verification email below.';
const passwordPolicyMesssage = 'Please choose a password that meets the password requirements.';
const rateLimitMessage = 'Too many attempts. Please wait a moment and try again.';
const genericErrorMessage = 'Something went wrong. Please try again.';

function validateFrontendRegistrationForm(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}) {
  const payload = {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: input.email.trim().toLowerCase(),
    password: input.password,
    confirmPassword: input.confirmPassword,
  };

  if (!payload.firstName) return { success: false as const, message: 'Please Enter A First Name' };
  if (!payload.lastName) return { success: false as const, message: 'Please Enter A Last Name' };
  if (!payload.email || !payload.email.includes('@') || !payload.email.includes('.')) {
    return { success: false as const, message: 'Please Enter A Valid Email Address' };
  }
  if (
    payload.password.length < 12 ||
    payload.password.length > 128 ||
    !/[a-z]/.test(payload.password) ||
    !/[A-Z]/.test(payload.password) ||
    !/\d/.test(payload.password) ||
    !/[^\sA-Za-z0-9]/.test(payload.password)
  ) {
    return { success: false as const, message: passwordPolicyMesssage };
  }
  if (!payload.confirmPassword) {
    return { success: false as const, message: 'Please Confirm Your Password' };
  }
  if (payload.password !== payload.confirmPassword) {
    return { success: false as const, message: 'Password Confirmation Must Match Password' };
  }

  return { success: true as const, data: payload };
}

function getRegistrationErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return genericErrorMessage;
  if (error.status === 409) return duplicateEmailMessage;
  if (error.status === 422) return passwordPolicyMesssage;
  if (error.status === 429) return rateLimitMessage;
  return genericErrorMessage;
}

function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [registeredEmailForVerification, setRegisteredEmailForVerification] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'danger'>('danger');
  const [showEmailVerificationModal, setShowEmailVerificationModal] = useState(false);
  // const [showSuccessfulRegistrationModal, setShowSuccessfulRegistrationModal] = useState(false);

  async function handleRegister(event: FormEvent) {
    event.preventDefault();
    setAlertMessage('');
    // setShowSuccessfulRegistrationModal(true); // SHOW THE SUCCESSFULL REGISTRATION MODAL
    const validationResult = validateFrontendRegistrationForm({
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

    const payload = validationResult.data;

    try {
      setIsLoading(true);

      await registerUser(payload);

      setRegisteredEmailForVerification(payload.email);
      setAlertType('success');
      setAlertMessage(pendingVerificationMessage);
      setShowEmailVerificationModal(true);
    } catch (error) {
      setAlertType('danger');
      setAlertMessage(getRegistrationErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResendVerification() {
    if (!registeredEmailForVerification || isResendingVerification) {
      return;
    }

    setIsResendingVerification(true);
    setAlertMessage('');

    try {
      await resendVerification({ email: registeredEmailForVerification });

      setAlertType('success');
      setAlertMessage(pendingVerificationMessage);
    } catch (error) {
      setAlertType('danger');
      setAlertMessage(
        error instanceof ApiError && error.status === 429 ? rateLimitMessage : genericErrorMessage,
      );
    } finally {
      setIsResendingVerification(false);
    }
  }

  const passwordPolicyPopover = (
    <div className="w-80 max-w-[calc(100vw-2rem)] bg-faint-purple shadow-lg">
      <div className="bg-gray-100 bg-light-purple px-3 py-2">
        <h3 className="font-semibold font-jost text-[1.2rem] text-purple tracking-wider sm:text-[1.4rem]">
          Password Requirements
        </h3>
      </div>

      <div className="px-3 py-2">
        <p className="text-sm font-overpass font-medium text-[0.95rem] text-dark-pink sm:text-[1.05rem]">
          - At Least 12 Characters
        </p>
        <p className="text-sm font-overpass font-medium text-[0.95rem] text-dark-pink sm:text-[1.05rem]">
          - At Most 128 Characters
        </p>
        <p className="text-sm font-overpass font-medium text-[0.95rem] text-dark-pink sm:text-[1.05rem]">
          - At Least ONE Uppercase Letter (A-Z)
        </p>
        <p className="text-sm font-overpass font-medium text-[0.95rem] text-dark-pink sm:text-[1.05rem]">
          - At Least ONE Lowercase Letter (a-z)
        </p>
        <p className="text-sm font-overpass font-medium text-[0.95rem] text-dark-pink sm:text-[1.05rem]">
          - At Least ONE Number (0-9)
        </p>
        <p className="text-sm font-overpass font-medium text-[0.95rem] text-dark-pink sm:text-[1.05rem]">
          - At Least ONE Special Character (e.g. ! @ # $ %)
        </p>
      </div>
    </div>
  );

  return (
    <AuthPageFrame
      leftWidth="78%"
      rightWidth="22%"
      responsive
      leftPanelClassName="lg:basis-[78%]"
      rightPanelClassName="lg:basis-[22%]"
      rightPanelStyle={{ padding: '2rem' }}
      leftChildren={
        <>
          <AuthPageIntro
            title="Get Started"
            titleStyle={{
              ...authLightTitleStyle,
              fontSize: 'clamp(2.55rem, 10vw, 5rem)',
            }}
            dividerStyle={{ marginBottom: '0.9rem' }}
            afterDivider={
              <AuthActionLink
                to="/organisation-registration-request"
                prefix="ORGANISATION?"
                emphasis="Get Started as an Organisation"
                outerStyle={{ marginBottom: '1.5rem' }}
                rowStyle={{
                  color: 'var(--ip-dark-pink)',
                  fontSize: 'clamp(1.05rem, 3.8vw, 1.4rem)',
                }}
                emphasisStyle={{ color: 'var(--ip-dark-pink)' }}
                iconStyle={{ color: 'var(--ip-dark-pink)' }}
              />
            }
          />

          {alertMessage && (
            <BasicAlert variant={alertType} onClose={() => setAlertMessage('')}>
              {alertMessage}
            </BasicAlert>
          )}

          {/* EMAIL VERIFICATION MODAL  */}
          <EmailVerificationModal
            isOpen={showEmailVerificationModal}
            email={registeredEmailForVerification}
            accountDescription="Individual Trainee"
            onResend={handleResendVerification}
          />

          {/* SUCCESSFUL REGISTRATION MODAL */}
          {/* <SuccessfulRegistrationModal
            isOpen={showSuccessfulRegistrationModal}
            firstName="Name" // First Name Goes Here
            accountDescription="Organisation Trainee" // This can be Individual Trainee or Organisation Trainee...
            organisation="My Organisation (Pty) Ltd" // SPECIFY '' (organisation={''}) IF YOU DO NOT WANT TO SHOW ORGANISATION INFORMATION
          /> */}

          <form onSubmit={handleRegister} noValidate style={authFormStyle}>
            <div
              style={{
                ...authFieldRowStyle,
                ...authResponsiveFieldRowStyle,
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
                labelStyle={authLightFieldLabelStyle}
                inputStyle={authLightFieldInputStyle}
              />

              <AuthFormField
                label="Last Name"
                type="text"
                value={lastName}
                disabled={isLoading}
                onChange={(event) => setLastName(event.target.value)}
                autoComplete="family-name"
                wrapperStyle={{ flex: 1 }}
                labelStyle={authLightFieldLabelStyle}
                inputStyle={authLightFieldInputStyle}
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
              labelStyle={authLightFieldLabelStyle}
              inputStyle={authLightFieldInputStyle}
            />

            <div
              style={{
                ...authFieldRowStyle,
                ...authResponsiveFieldRowStyle,
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
                      style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)' }}
                    >
                      info
                    </span>
                  </Popover>
                }
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                wrapperStyle={{ flex: 1 }}
                labelStyle={authLightFieldLabelStyle}
                inputStyle={authLightFieldInputStyle}
              />

              <AuthFormField
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                disabled={isLoading}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                wrapperStyle={{ flex: 1 }}
                labelStyle={authLightFieldLabelStyle}
                inputStyle={authLightFieldInputStyle}
              />
            </div>

            <div
              style={{
                ...authResponsiveActionRowStyle,
              }}
            >
              <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-72"
                style={{
                  ...authPrimaryButtonStyle,
                  height: '60px',
                  fontSize: 'clamp(1.35rem, 4.5vw, 1.7rem)',
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

              <AuthActionLink
                to="/login"
                prefix="ALREADY REGISTERED?"
                emphasis="Log In"
                rowStyle={{
                  color: 'var(--ip-dark-pink)',
                  fontSize: 'clamp(1.05rem, 3.8vw, 1.4rem)',
                }}
                emphasisStyle={{ color: 'var(--ip-dark-pink)' }}
                iconStyle={{ color: 'var(--ip-dark-pink)' }}
              />
            </div>
          </form>
        </>
      }
      rightChildren={
        <img
          src="/main_logo_light_motto.png"
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
