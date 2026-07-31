import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  SchoolOutlined,
  BusinessOutlined,
  AdminPanelSettingsOutlined,
  SecurityOutlined,
  InfoOutlined,
  HelpOutlineSharp,
} from '@mui/icons-material';
import { useAuth } from '../../context/useAuth';

function Sidebar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const { user, authContext } = useAuth();
  const role = authContext?.role || user?.userType;

  const getNavItems = () => {
    if (role === 'IP_ADMIN') {
      return [
        {
          icon: <AdminPanelSettingsOutlined />,
          label: 'Platform Administrators',
          path: '/platform-administrators',
        },
        {
          icon: <BusinessOutlined />,
          label: 'Organisation Management',
          path: '/organisation-management',
        },
      ];
    }
    if (role === 'ORGANISATION_ADMIN') {
      return [
        {
          icon: <InfoOutlined />,
          label: 'Organisation Information',
          path: '/organisation-information',
        },
        {
          icon: <SecurityOutlined />,
          label: 'Security Preferences',
          path: '/organisation-security-preferences',
        },
        {
          icon: <SchoolOutlined />,
          label: 'Trainees',
          path: '/organisation-trainees',
        },
        {
          icon: <AdminPanelSettingsOutlined />,
          label: 'Administrators',
          path: '/organisation-administrators',
        },
      ];
    }
    return [
      {
        icon: <SchoolOutlined />,
        label: 'Campaigns',
        path: '/campaigns',
      },
      {
        icon: <HelpOutlineSharp />,
        label: 'Help',
        path: 'https://github.com/COS301-SE-2026/Cybersecurity-Awareness-Training-Platform/wiki/Demo-2-User-Manual',
      },
    ];
  };

  const navItems = getNavItems();

  return (
    <aside
      style={{
        width: drawerOpen ? '360px' : '84px',
        backgroundColor: '#25004E',
        transition: '0.22s ease',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: '1.4rem',
        color: 'white',
        flexShrink: 0,
        boxSizing: 'border-box',
      }}
    >
      {/* HAMBUrGER */}

      <button
        onClick={() => setDrawerOpen(!drawerOpen)}
        style={{
          width: '100%',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: drawerOpen ? 'flex-start' : 'center',
          paddingLeft: drawerOpen ? '1.56rem' : '0',
          marginLeft: '0.21rem',
          background: 'none',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          marginBottom: '1rem',
          boxSizing: 'border-box',
        }}
      >
        <Menu
          style={{
            fontSize: '2.2rem',
          }}
        />
      </button>

      {/* NAV ItEMS */}

      {navItems.map((item) => (
        <button
          key={item.label}
          onClick={() => navigate(item.path)}
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: drawerOpen ? 'flex-start' : 'center',
            gap: '1.38rem',
            height: '56px',
            paddingLeft: drawerOpen ? '1.56rem' : '0',
            paddingRight: '0',
            paddingTop: '0',
            paddingBottom: '0',
            marginBottom: '1.16rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            color: 'white',
            transition: '0.22s ease',
            boxSizing: 'border-box',
            background: 'none',
            border: 'none',
            width: '100%',
          }}
        >
          {/* IC0N */}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '35px',
            }}
          >
            {item.icon.type && (
              <item.icon.type
                style={{
                  fontSize: '2.1rem',
                }}
              />
            )}
          </div>

          {/* LABEL */}

          {drawerOpen && (
            <span
              style={{
                fontFamily: 'Jost',
                fontSize: '1.6rem',
                fontWeight: 400,
                letterSpacing: '0.012em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textAlign: 'left',
              }}
            >
              {item.label}
            </span>
          )}
        </button>
      ))}
    </aside>
  );
}

export default Sidebar;
