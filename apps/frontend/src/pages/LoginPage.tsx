import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Spinner } from 'flowbite-react';
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
                {isLoading && <Spinner size="sm" color="white" />}
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
            <AuthFormField
              label="Password"
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
