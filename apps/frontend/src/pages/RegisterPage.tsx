import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import BasicAlert from '../components/alerts/BasicAlert';
import { Popover } from 'flowbite-react';

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
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'danger'>('danger');

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
          setAlertType('danger');
          setAlertMessage('An Account With This Email Address Already Exists');
          return;
        }

        setAlertType('danger');
        setAlertMessage(formatAlertMessage(data.message) || 'Registration Failed');

        return;
      }

      // THIS WILL PROBABLY CHANGE (EMAIL VERIFICATION)......
      setAlertType('success');
      setAlertMessage('Registration Successfull. Redirecting To Login');

      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch {
      setAlertType('danger');
      setAlertMessage('Unable To Connect To The Server');
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
            title="Welcome"
            dividerStyle={{ marginBottom: '0.9rem' }}
            afterDivider={
              <AuthActionLink
                // THIS NEEDS TO GO TO THE ORGANISATION REGISTRATION REQUEST
                to="/register"
                prefix="ORGANISATION?"
                emphasis="Register as an Organisation"
                outerStyle={{ marginBottom: '1.5rem' }}
              />
            }
          />

          {alertMessage && (
            <BasicAlert variant={alertType} onClose={() => setAlertMessage('')}>
              {alertMessage}
            </BasicAlert>
          )}

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
                rightLabel={
                  <Popover
                    content={passwordPolicyPopover}
                    arrow={false}
                    theme={{
                      base: 'rounded-none bg-transparent border-0 shadow-xl absolute z-20 inline-block w-max max-w-[100vw] outline-none',
                      content: 'relative',
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
                Register
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
