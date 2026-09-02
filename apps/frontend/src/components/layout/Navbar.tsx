import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';

import { ExpandLess, ExpandMore, Logout, Settings, PersonOutlined } from '@mui/icons-material';

function Navbar() {
  const [profileOpen, setProfileOpen] = useState(false);

  const navigate = useNavigate();

  const { logout, user } = useAuth();

  return (
    <nav
      style={{
        width: '100%',
        height: '82px',
        backgroundColor: 'var(--ip-faint-purple)',
        // borderBottom: '5px solid #8400FF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: '1rem',
        paddingRight: '1.5rem',
        boxSizing: 'border-box',
        flexShrink: 0,
        zIndex: 100,
      }}
    >
      {/* LOGO */}

      <img
        src="/secondary_logo_light_motto.png"
        alt="Insightful Phish"
        style={{
          height: '78px',
          objectFit: 'contain',
        }}
      />

      {/* PROFILE */}

      <div
        style={{
          position: 'relative',
        }}
      >
        <button
          onClick={() => setProfileOpen(!profileOpen)}
          style={{
            height: '50px',
            backgroundColor: 'var(--ip-light-bg-purple)',
            border: '0px solid rgba(255,255,255,0.00)',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1.1rem',
            color: 'var(--ip-deep-purple)',
            fontFamily: 'Jost',
            fontSize: '1.3rem',
            fontWeight: 400,
            cursor: 'pointer',
            letterSpacing: '0.06rem',
          }}
        >
          <PersonOutlined
            style={{
              fontSize: '1.6rem',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span>{user ? `${user.firstName} ${user.lastName}` : 'Account'}</span>
          </div>
          {profileOpen ? (
            <ExpandLess
              style={{
                fontSize: '2rem',
              }}
            />
          ) : (
            <ExpandMore
              style={{
                fontSize: '2rem',
              }}
            />
          )}
        </button>

        {profileOpen && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              minWidth: '100%',
              backgroundColor: 'var(--ip-light-bg-purple)',
              border: '2px solid var(--ip-bg-purple)',
              boxShadow: '0px 10px 30px rgba(0,0,0,0.50)',
              overflow: 'hidden',
            }}
          >
            {/* SETTINGS  */}
            <button
              type="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  navigate('/account-management');
                }
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.7rem',
                padding: '1rem',
                border: 'none',
                backgroundColor: 'var(--ip-light-bg-purple)',
                fontFamily: 'Overpass',
                fontWeight: '600',
                fontSize: '1.1rem',
                color: 'var(--ip-deep-purple)',
                cursor: 'pointer',
                transition: '0.2s ease',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--ip-bg-purple)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--ip-light-bg-purple)';
              }}
              onClick={() => {
                navigate('/account-management');
              }}
            >
              <Settings
                style={{
                  fontSize: '1.4rem',
                }}
              />
              Account Management
            </button>

            {/* LOGOUT */}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.7rem',
                padding: '1rem',
                fontFamily: 'Overpass',
                fontWeight: '600',
                fontSize: '1.1rem',
                color: 'var(--ip-deep-purple)',
                cursor: 'pointer',
                transition: '0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--ip-bg-purple)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--ip-light-bg-purple)';
              }}
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              <Logout
                style={{
                  fontSize: '1.4rem',
                }}
              />
              Logout
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
