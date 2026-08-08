import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';

import { ExpandLess, ExpandMore, Logout, Settings, PersonOutlined } from '@mui/icons-material';

function getRoleLabel(role?: string | null, platformAdminRole?: string | null) {
  if (role === 'IP_ADMIN') {
    return platformAdminRole === 'SUPER_ADMIN' ? 'Super Admin' : 'Platform Admin';
  }
  if (role === 'ORGANISATION_ADMIN') {
    return 'Organisation Admin';
  }
  if (role === 'ORGANISATION_TRAINEE') {
    return 'Organisation Trainee';
  }
  if (role === 'GENERAL_TRAINEE') {
    return 'General Trainee';
  }
  return 'Trainee';
}

function Navbar() {
  const [profileOpen, setProfileOpen] = useState(false);

  const navigate = useNavigate();

  const { logout, user, authContext } = useAuth();
  const roleLabel = getRoleLabel(
    authContext?.role || user?.userType,
    authContext?.platformAdminRole,
  );
  const orgName = authContext?.organisation?.name;

  return (
    <nav
      style={{
        width: '100%',
        height: '82px',
        backgroundColor: '#090054',
        borderBottom: '5px solid #8400FF',
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
        src="/logo-long-dark.png"
        alt="Insightful Phish"
        style={{
          height: '68px',
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
            backgroundColor: '#2E0090',
            border: '0px solid rgba(255,255,255,0.00)',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1.1rem',
            color: 'white',
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
            {user && (
              <span style={{ fontSize: '0.8rem', color: '#c9a2ff', opacity: 0.9 }}>
                {roleLabel}
                {orgName ? ` • ${orgName}` : ''}
              </span>
            )}
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
              backgroundColor: '#1F0047',
              border: '2px solid #42008C',
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
                display: 'flex',
                alignItems: 'center',
                gap: '0.7rem',
                padding: '1rem',
                fontFamily: 'Overpass',
                fontWeight: '600',
                fontSize: '1.1rem',
                color: 'white',
                cursor: 'pointer',
                transition: '0.2s ease',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2b0056';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#1F0047';
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
                color: 'white',
                cursor: 'pointer',
                transition: '0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2b0056';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#1F0047';
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
