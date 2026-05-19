import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AuthActionLink,
  AuthFormField,
  AuthPageFrame,
  AuthPageIntro,
} from '../components/auth/AuthPrimitives';
import { authFormStyle, authPrimaryButtonStyle } from '../components/auth/authStyles';
import { useAuth } from '../context/useAuth';

import { authLoginRequestSchema } from '@insightful-phish/shared';

function LoginPage() {
  const navigate = useNavigate();

  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [loginMessage, setLoginMessage] = useState('');

  async function handleLogin(event: FormEvent) {
    event.preventDefault();

    setEmailError('');
    setPasswordError('');
    setLoginMessage('');

    const validationResult = authLoginRequestSchema.safeParse({
      email,
      password,
    });

    if (!validationResult.success) {
      const issue = validationResult.error.issues[0];

      if (issue?.path.includes('email')) {
        setEmailError(issue.message);
      } else if (issue?.path.includes('password')) {
        setPasswordError(issue.message);
      }

      return;
    }

    try {
      setLoginMessage('LOGGING IN...');

      const response = await fetch('http://localhost:4000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validationResult.data),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setLoginMessage('INVALID EMAIL OR PASSWORD');

          return;
        }

        setLoginMessage(data.message || 'LOGIN FAILED');

        return;
      }

      login(data.token, {
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        email: data.user.email,
      });

      navigate('/campaigns');
    } catch {
      setLoginMessage('UNABLE TO CONNECT TO SERVER');
    }
  }

  return (
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
            message={emailError || passwordError || loginMessage}
            messageStyle={{ marginBottom: '1rem' }}
          />

          <form onSubmit={handleLogin} noValidate style={authFormStyle}>
            <AuthFormField
              label="Email Address"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              wrapperStyle={{ marginBottom: '1.5rem' }}
              inputStyle={{ height: '52px' }}
            />

            <AuthFormField
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              wrapperStyle={{ marginBottom: '2rem' }}
              inputStyle={{ height: '52px' }}
            />

            <button
              type="submit"
              style={{
                ...authPrimaryButtonStyle,
                width: '100%',
                height: '56px',
                fontSize: '1.7rem',
                marginBottom: '1rem',
                cursor: 'pointer',
              }}
            >
              LOGIN
            </button>

            <AuthActionLink
              to="/register"
              prefix="NEW?"
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
  );
}

export default LoginPage;
