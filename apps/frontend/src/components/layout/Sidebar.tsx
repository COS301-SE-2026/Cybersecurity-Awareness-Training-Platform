import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, SchoolOutlined } from '@mui/icons-material';
import SecuritySharpIcon from '@mui/icons-material/SecuritySharp'; // Organisation Security Preferences Page (ORG ADMIN, NORM ADMIN, SUPER ADMIN)
import CorporateFareSharpIcon from '@mui/icons-material/CorporateFareSharp'; // Organisation Management Page (NORM ADMIN, SUPER ADMIN)
import GroupsSharpIcon from '@mui/icons-material/GroupsSharp'; // Organisation Trainees Page (ORG ADMIN, NORM ADMIN, SUPER ADMIN)
import AdminPanelSettingsSharpIcon from '@mui/icons-material/AdminPanelSettingsSharp'; // Platform Administors Page (NORM ADMIN, SUPER ADMIN)
import SupervisorAccountSharpIcon from '@mui/icons-material/SupervisorAccountSharp'; // Organisation Administrators Page (ORG ADMIN, NORM ADMIN, SUPER ADMIN)
import { useAuth } from '../../context/useAuth';

/*
1. PLATFORM ADMIN PAGE (Norm, Super Admins)
2. ORG MGMT PAGE (Norm, Super Admins)
3. ORG SECURITY PAGE (Org, Norm, Super Admins)
4. ORG ADMIN PAGE (Org, Norm, Super Admins)
5. ORG TRAINEES PAGE (Org, Norm, Super Admins)
*/

function Sidebar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  // RETURNS THE CURRENT USER'S AUTH CONTEXT (SO WE KNOW WHAT KIND OF USER IS LOGGED IN)
  const { authContext } = useAuth();

  // BOOLEAN FLAGS FOR ROLES
  const isIPAdministrator = authContext?.role === 'IP_ADMIN';
  const isPlatformAdministrator = authContext?.platformAdminRole === 'NORMAL_ADMIN';
  const isSuperAdministrator = authContext?.platformAdminRole === 'SUPER_ADMIN';
  const isOrganisationAdministrator = authContext?.role === 'ORGANISATION_ADMIN';

  const navItems = [
    {
      icon: <SchoolOutlined />,
      label: 'Campaigns',
      path: '/campaigns',
    },
    // NORMAL ADMIN && SUPER ADMIN SPECIFIC NAV ITEMS
    ...(isIPAdministrator && (isPlatformAdministrator || isSuperAdministrator)
      ? [
          // Platform Administrators Page (1)
          {
            icon: <AdminPanelSettingsSharpIcon />,
            label: 'Platform Administrators',
            path: '/platform-administrators',
          },
          // Organisation Management Page (2)
          {
            icon: <CorporateFareSharpIcon />,
            label: 'Organisation Management',
            path: '/organisation-management',
          },
        ]
      : []),
    // ORGANISATION ADMIN SPECIFIC NAV ITEMS
    ...(isOrganisationAdministrator
      ? [
          // Organisation Security Preferences Page (3)
          {
            icon: <SecuritySharpIcon />,
            label: 'Organisation Security Preferences',
            path: '/organisation-security-preferences',
          },
          // Organisation Administrators Page (4)
          {
            icon: <SupervisorAccountSharpIcon />,
            label: 'Organisation Administrators',
            path: '/organisation-administrators',
          },
          // Organisation Trainees Page (5)
          {
            icon: <GroupsSharpIcon />,
            label: 'Organisation Trainees',
            path: '/organisation-trainees',
          },
        ]
      : []),
  ];

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
