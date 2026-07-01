import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
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
function RegisterPage() {
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');

  async function handleRegister(event: FormEvent) {
    event.preventDefault();

    setMessage('');

    const validationResult = authRegisterRequestSchema.safeParse({
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
    });

    if (!validationResult.success) {
      setMessage(validationResult.error.issues[0]?.message || 'INVALID INPUT');

      return;
    }

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
        if (response.status === 409) {
          setMessage('AN ACCOUNT WITH THIS EMAIL ALREADY EXISTS');

          return;
        }

        setMessage(data.message || 'REGISTRATION FAILED');

        return;
      }

      setMessage('REGISTRATION SUCCESSFUL. REDIRECTING TO LOGIN...');

      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch {
      setMessage('UNABLE TO CONNECT TO SERVER');
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
            title="Welcome"
            dividerStyle={{ marginBottom: '3rem' }} // Set to 0.9 later
            /*afterDivider={
              <AuthActionLink
                to="/register"
                prefix="ORGANISATION?"
                emphasis="Register as an Organisation"
                outerStyle={{ marginBottom: '1.5rem' }}
              />
            }*/
            message={message}
            messageStyle={{ marginBottom: '1.5rem' }}
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
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                autoComplete="given-name"
                wrapperStyle={{ flex: 1 }}
              />

              <AuthFormField
                label="Last Name"
                type="text"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                autoComplete="family-name"
                wrapperStyle={{ flex: 1 }}
              />
            </div>

            <AuthFormField
              label="Email Address"
              type="email"
              value={email}
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
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                wrapperStyle={{ flex: 1 }}
              />

              <AuthFormField
                label="Confirm Password"
                type="password"
                value={confirmPassword}
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
                style={{
                  ...authPrimaryButtonStyle,
                  width: '48%',
                  height: '60px',
                  fontSize: '1.7rem',
                  cursor: 'pointer',
                }}
              >
                REGISTER
              </button>

              <AuthActionLink to="/login" prefix="ALREADY REGISTERED?" emphasis="Login" />
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
