import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/useAuth';

import { Link } from 'react-router-dom';

function LoginPage() {
  const navigate = useNavigate();

  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [loginMessage, setLoginMessage] = useState('');

  function handleLogin(event: React.FormEvent) {
    event.preventDefault();

    setEmailError('');
    setPasswordError('');
    setLoginMessage('');

    let valid = true;

    if (!email.trim() || !email.includes('@')) {
      setEmailError('PLEASE ENTER A VALID EMAIL ADDRESS');

      valid = false;
    }

    if (!password.trim()) {
      setPasswordError('PLEASE ENTER YOUR PASSWORD');

      valid = false;
    }

    if (!valid) {
      return;
    }

    setLoginMessage('LOGGING IN...');

    login();

    navigate('/campaigns');
  }

  return (
    <main
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        overflow: 'hidden',
        backgroundColor: '#040025',
      }}
    >
      {/* LEFT PANEL */}

      <section
        style={{
          width: '50%',
          backgroundColor: '#2F0360',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          paddingLeft: '5vw',
          paddingRight: '4vw',
        }}
      >
        {/* LOGO */}

        <img
          src="/logo.png"
          alt="Insightful Phish Logo"
          style={{
            width: '200px',
            marginBottom: '2rem',
            marginLeft: '-12px',
          }}
        />

        {/* WELCOME */}

        <h1
          style={{
            fontFamily: 'Jost',
            fontWeight: 400,
            fontSize: '5rem',
            letterSpacing: '0.03em',
            color: '#D6B3FF',
            margin: 0,
            marginBottom: '1rem',
            lineHeight: 1,
          }}
        >
          Welcome Back
        </h1>

        {/* DIVIDER */}

        <div
          style={{
            width: '100%',
            height: '5px',
            backgroundColor: '#8400FF',
            marginBottom: '2rem',
          }}
        />

        {/* LOGIN MESSAGE */}

        {(emailError || passwordError || loginMessage) && (
          <p
            style={{
              margin: 0,
              marginBottom: '1rem',
              color: 'white',
              fontFamily: 'Jost',
              fontWeight: 500,
              fontSize: '1.2rem',
              letterSpacing: '0.03em',
            }}
          >
            {emailError || passwordError || loginMessage}
          </p>
        )}

        {/* FORM */}

        <form
          onSubmit={handleLogin}
          noValidate
          style={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* EMAIL */}

          <div
            style={{
              marginBottom: '1.5rem',
            }}
          >
            <label
              style={{
                display: 'block',
                fontFamily: 'Jost',
                fontWeight: 400,
                fontSize: '1.5rem',
                letterSpacing: '0.05em',
                color: '#B37DFF',
                marginBottom: '0.4rem',
              }}
            >
              Email Address
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              style={{
                width: '100%',
                height: '52px',
                backgroundColor: '#090054',
                border: 'none',
                outline: 'none',
                padding: '0 1rem',
                letterSpacing: '0.05em',
                color: 'white',
                fontFamily: 'Overpass',
                fontSize: '1.4rem',
              }}
            />
          </div>

          {/* PASSWORD */}

          <div
            style={{
              marginBottom: '2rem',
            }}
          >
            <label
              style={{
                display: 'block',
                fontFamily: 'Jost',
                fontWeight: 400,
                fontSize: '1.5rem',
                letterSpacing: '0.05em',
                color: '#B37DFF',
                marginBottom: '0.4rem',
              }}
            >
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              style={{
                width: '100%',
                height: '52px',
                backgroundColor: '#090054',
                border: 'none',
                outline: 'none',
                padding: '0 1rem',
                letterSpacing: '0.05em',
                color: 'white',
                fontFamily: 'Overpass',
                fontSize: '1.4rem',
              }}
            />
          </div>

          {/* BUTTON */}

          <button
            type="submit"
            style={{
              width: '100%',
              height: '56px',
              border: 'none',
              cursor: 'pointer',
              background: '#8400FF',
              color: '#D6B3FF',
              fontFamily: 'Jost',
              fontWeight: 400,
              fontSize: '1.7rem',
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
              marginBottom: '1rem',
            }}
          >
            LOGIN
          </button>

          {/* REGISTER */}
          <Link
            to="/register"
            style={{
              textDecoration: 'none',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                margin: 0,
                fontFamily: 'Jost',
                fontSize: '1.4rem',
                letterSpacing: '0.05em',
                color: '#B37DFF',
                fontWeight: 400,
                cursor: 'pointer',
              }}
            >
              <span>
                NEW?{' '}
                <span
                  style={{
                    fontWeight: 500,
                  }}
                >
                  Register an Account
                </span>
              </span>

              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: '2rem',
                  color: '#B37DFF',
                }}
              >
                arrow_forward
              </span>
            </div>
          </Link>
        </form>
      </section>

      {/* RIGHT PANEL */}

      <section
        style={{
          width: '50%',
          backgroundColor: '#090054',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingRight: '6vw',
        }}
      >
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
          DON’T
          <br />
          TAKE
          <br />
          THE
          <br />
          BAIT
        </h2>
      </section>
    </main>
  );
}

export default LoginPage;
