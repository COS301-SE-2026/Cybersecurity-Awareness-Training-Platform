import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

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
      setMessage('PLEASE ENTER YOUR FIRST NAME');

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
          width: '78%',
          backgroundColor: '#2F0360',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          paddingLeft: '5vw',
          paddingRight: '4vw',
        }}
      >
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
          Welcome
        </h1>

        {/* DIVIDER */}

        <div
          style={{
            width: '100%',
            height: '5px',
            backgroundColor: '#8400FF',
            marginBottom: '0.9rem',
          }}
        />

        {/* ORGANISATION */}

        <Link
          to="/register"
          style={{
            textDecoration: 'none',
            width: 'fit-content',
            marginBottom: '1.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontFamily: 'Jost',
              fontSize: '1.4rem',
              letterSpacing: '0.05em',
              color: '#D6B3FF',
              fontWeight: 400,
            }}
          >
            <span>
              ORGANISATION?{' '}
              <span
                style={{
                  fontWeight: 500,
                }}
              >
                Register as an Organisation
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

        {/* MESSAGE */}

        {message && (
          <p
            style={{
              margin: 0,
              marginBottom: '1.5rem',
              color: 'white',
              fontFamily: 'Jost',
              fontWeight: 500,
              fontSize: '1.2rem',
              letterSpacing: '0.03em',
            }}
          >
            {message}
          </p>
        )}

        {/* FORM */}

        <form
          onSubmit={handleRegister}
          noValidate
          style={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* NAME ROW */}

          <div
            style={{
              display: 'flex',
              gap: '2.5rem',
              marginBottom: '1.8rem',
            }}
          >
            {/* FIRST NAME */}

            <div
              style={{
                flex: 1,
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
                First Name
              </label>

              <input
                type="text"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                style={{
                  width: '100%',
                  height: '60px',
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

            {/* LAST NAME */}

            <div
              style={{
                flex: 1,
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
                Last Name
              </label>

              <input
                type="text"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                style={{
                  width: '100%',
                  height: '60px',
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
          </div>

          {/* EMAIL */}

          <div
            style={{
              marginBottom: '1.8rem',
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
                height: '60px',
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

          {/* PASSWORD ROW */}

          <div
            style={{
              display: 'flex',
              gap: '2.5rem',
              marginBottom: '2.5rem',
            }}
          >
            {/* PASSWORD */}

            <div
              style={{
                flex: 1,
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
                  height: '60px',
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

            {/* CONFIRM PASSWORD */}

            <div
              style={{
                flex: 1,
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
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                style={{
                  width: '100%',
                  height: '60px',
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
          </div>

          {/* BOTTOM ROW */}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2.5rem',
            }}
          >
            {/* BUTTON */}

            <button
              type="submit"
              style={{
                width: '48%',
                height: '60px',
                border: 'none',
                cursor: 'pointer',
                background: '#8400FF',
                color: '#D6B3FF',
                fontFamily: 'Jost',
                fontWeight: 400,
                fontSize: '2rem',
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
              }}
            >
              REGISTER
            </button>

            {/* LOGIN */}

            <Link
              to="/login"
              style={{
                textDecoration: 'none',
                width: 'fit-content',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontFamily: 'Jost',
                  fontSize: '1.4rem',
                  letterSpacing: '0.05em',
                  color: '#B37DFF',
                  fontWeight: 400,
                }}
              >
                <span>
                  ALREADY REGISTERED?{' '}
                  <span
                    style={{
                      fontWeight: 500,
                    }}
                  >
                    Login
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
          </div>
        </form>
      </section>

      {/* RIGHT PANEL */}

      <section
        style={{
          width: '22%',
          backgroundColor: '#090054',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '2rem',
        }}
      >
        <img
          src="/logo-motto.png"
          alt="Insightful Phish Logo"
          style={{
            width: '100%',
            maxWidth: '300px',
          }}
        />
      </section>
    </main>
  );
}

export default RegisterPage;
