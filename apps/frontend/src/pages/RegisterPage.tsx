import { useState } from 'react';
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

function RegisterPage() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');

  function handleRegister(event: React.FormEvent) {
    event.preventDefault();

    setMessage('');

    if (!firstName.trim()) {
      setMessage('PLEASE ENTER YOUR FIRST NAME(S)');

      return;
    }

    if (!lastName.trim()) {
      setMessage('PLEASE ENTER YOUR LAST NAME');

      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setMessage('PLEASE ENTER A VALID EMAIL ADDRESS');

      return;
    }

    if (password.length < 8) {
      setMessage('PASSWORD MUST BE AT LEAST 8 CHARACTERS');

      return;
    }

    if (!/\d/.test(password)) {
      setMessage('PASSWORD MUST CONTAIN AT LEAST ONE NUMBER');

      return;
    }

    if (password !== confirmPassword) {
      setMessage('PASSWORD DO NOT MATCH');

      return;
    }

    setMessage('REGISTRATION SUCCESSFULL. REDIRECTING TO LOGIN...');

    setTimeout(() => {
      navigate('/login');
    }, 1500);
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
            dividerStyle={{ marginBottom: '0.9rem' }}
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
