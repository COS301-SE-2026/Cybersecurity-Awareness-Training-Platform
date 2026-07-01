import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import GetStartedModal from '../components/landing-page/GetStartedModal';

function formatAlertMessage(message: string) {
  // makes everything title case and removes the . from the end of the message
  return message
    .replace(/\.$/, '')
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function getRedirectPath() {
  // Route Users Based on ROLE

  // LATER ON: We can do something like this (FOR EXAMPLE):
  // function getRedirectPath(role: UserRole) {
  //   case 'ADMIN':
  //     return '/admin';
  //   case 'EMPLOYEE':
  //     return '/campaigns';
  // }
  // For now, leave it as '/campaigns'
  return '/campaigns';
}

function LoginPage() {
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate(getRedirectPath(), { replace: true });
    }
  }, [isAuthenticated, navigate]);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setAlertMessage('');
    setIsLoading(true);
    const validationResult = authLoginRequestSchema.safeParse({
      email,
      password,
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
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validationResult.data),
      });

      const data = await response.json();

      if (!response.ok) {
        setIsLoading(false);

        if (response.status === 401) {
          setAlertMessage('Invalid Email Address Or Password');
          return;
        }

        if (response.status === 403) {
          // FIX THIS TO BE MORE SPECIFIC BASED OFF OF THE DATA CODES FROM BACKEND
          // It will be FIXED during IMPLEMENTATION (NOT AS OF YET/RIGHT NOW [29 June 2026])
          // It should be OKAY for now...
          //   For example,
          //   if (data.code === 'EMAIL_NOT_VERIFIED') {
          //        setAlertMessage('Email Not Verified');
          //   }

          setAlertMessage(formatAlertMessage(data.message) || 'Access Denied');
          return;
        }

        setAlertMessage(formatAlertMessage(data.message) || 'Login Failed');
        return;
      }

      login(data.token, {
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        email: data.user.email,
      });

      navigate(getRedirectPath());
    } catch {
      setIsLoading(false);
      setAlertMessage('Unable To Connect To Server');
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
                  value=""
                  disabled={isLoading}
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
