function LoginPage() {
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
            marginBottom: '2.5rem',
          }}
        />

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

        <p
          style={{
            margin: 0,
            fontFamily: 'Jost',
            fontSize: '1.4rem',
            letterSpacing: '0.05em',
            color: '#B37DFF',
            fontWeight: 400,
          }}
        >
          NEW?{' '}
          <span
            style={{
              fontWeight: 500,
            }}
          >
            Register an Account
          </span>
        </p>
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
