import { useState } from 'react';
import type { ReactElement } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  SchoolOutlined,
  BusinessOutlined,
  AdminPanelSettingsOutlined,
  CampaignOutlined,
  AssignmentTurnedInOutlined,
  SecurityOutlined,
  InfoOutlined,
  HelpOutlineSharp,
} from '@mui/icons-material';
import { useAuth } from '../../context/useAuth';

type InternalNavItem = { icon: ReactElement; label: string; path: string };
type ExternalNavItem = { icon: ReactElement; label: string; href: string };
type NavItem = InternalNavItem | ExternalNavItem;

function Sidebar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, authContext, permissions } = useAuth();
  const role = authContext?.role || user?.userType;
  const organisationId = authContext?.organisation?.id;
  const canAccessOrganisationCampaigns = permissions.some(
    (permission) => permission === 'VIEW_CAMPAIGNS' || permission === 'MANAGE_CAMPAIGNS',
  );
  const { user, authContext, permissions } = useAuth();
  const role = authContext?.role || user?.userType;
  const organisationId = authContext?.organisation?.id;
  const campaignAssignmentPath = `/organisations/${encodeURIComponent(organisationId ?? '')}/campaign-assignments/new`;
  const canAssignTrainingCampaigns =
    role === 'ORGANISATION_ADMIN' &&
    typeof organisationId === 'string' &&
    permissions.includes('ASSIGN_CAMPAIGNS');

  const getNavItems = (): NavItem[] => {
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
        {
          icon: <CampaignOutlined />,
          label: 'Campaigns',
          path: '/platform/campaigns',
        },
      ];
    }
    if (role === 'ORGANISATION_ADMIN') {
      const organisationItems: NavItem[] = [
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
        ...(canAssignTrainingCampaigns === true
          ? [
              {
                icon: <AssignmentTurnedInOutlined />,
                label: 'Assign Training Campaigns',
                path: campaignAssignmentPath,
              },
            ]
          : []),
        {
          icon: <AdminPanelSettingsOutlined />,
          label: 'Administrators',
          path: '/organisation-administrators',
        },
      ];

      if (organisationId && canAccessOrganisationCampaigns) {
        organisationItems.push({
          icon: <CampaignOutlined />,
          label: 'Campaigns',
          path: `/organisations/${organisationId}/campaigns`,
        });
      }

      return organisationItems;
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
        href: 'https://github.com/COS301-SE-2026/Cybersecurity-Awareness-Training-Platform/wiki/Demo-2-User-Manual',
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

      {navItems.map((item) => {
        const NavigationItem = 'href' in item ? 'a' : 'button';
        const isActive =
          'path' in item &&
          (location.pathname === item.path || location.pathname.startsWith(`${item.path}/`));

        return (
          <NavigationItem
            key={item.label}
            href={'href' in item ? item.href : undefined}
            target={'href' in item ? '_blank' : undefined}
            rel={'href' in item ? 'noopener noreferrer' : undefined}
            onClick={'path' in item ? () => navigate(item.path) : undefined}
            type={'path' in item ? 'button' : undefined}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
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
              background: isActive ? 'rgba(255, 255, 255, 0.14)' : 'none',
              border: 'none',
              borderLeft: isActive ? '4px solid #cca7ff' : '4px solid transparent',
              width: '100%',
              textDecoration: 'none',
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
          </NavigationItem>
        );
      })}
    </aside>
  );
}

export default Sidebar;
