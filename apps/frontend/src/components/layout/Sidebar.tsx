import type { ReactElement } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  SchoolOutlined,
  BusinessOutlined,
  AdminPanelSettingsOutlined,
  CampaignOutlined,
  AssignmentTurnedInOutlined,
  SecurityOutlined,
  InfoOutlined,
  HelpOutlineSharp,
  MarkEmailReadOutlined,
} from '@mui/icons-material';
import { useAuth } from '../../context/useAuth';

type InternalNavItem = { icon: ReactElement; label: string; path: string };
type ExternalNavItem = { icon: ReactElement; label: string; href: string };
type NavItem = InternalNavItem | ExternalNavItem;

const adminHelpNavItem: ExternalNavItem = {
  icon: <HelpOutlineSharp />,
  label: 'Help',
  href: 'https://github.com/COS301-SE-2026/Cybersecurity-Awareness-Training-Platform/wiki/Demo-3-Admin-User-Manual',
};

const traineeHelpNavItem: ExternalNavItem = {
  icon: <HelpOutlineSharp />,
  label: 'Help',
  href: 'https://github.com/COS301-SE-2026/Cybersecurity-Awareness-Training-Platform/wiki/Demo-3-User-Manual',
};

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, authContext, permissions } = useAuth();
  const role = authContext?.role || user?.userType;
  const organisationId = authContext?.organisation?.id;
  const canAccessOrganisationCampaigns = permissions.some(
    (permission) => permission === 'VIEW_CAMPAIGNS' || permission === 'MANAGE_CAMPAIGNS',
  );
  const canAccessOrganisationContent = canAccessOrganisationCampaigns;
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
        adminHelpNavItem,
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

      if (organisationId && canAccessOrganisationCampaigns) {
        organisationItems.push({
          icon: <CampaignOutlined />,
          label: 'Campaigns',
          path: `/organisations/${organisationId}/campaigns`,
        });
      }

      if (organisationId && canAccessOrganisationContent) {
        organisationItems.push({
          icon: <MarkEmailReadOutlined />,
          label: 'Content Management',
          path: `/organisations/${organisationId}/content`,
        });
      }

      if (canAssignTrainingCampaigns) {
        organisationItems.push({
          icon: <AssignmentTurnedInOutlined />,
          label: 'Assign Training Campaigns',
          path: campaignAssignmentPath,
        });
      }

      organisationItems.push({
        icon: <SecurityOutlined />,
        label: 'Security Preferences',
        path: '/organisation-security-preferences',
      });
      organisationItems.push(adminHelpNavItem);

      return organisationItems;
    }

    return [
      {
        icon: <SchoolOutlined />,
        label: 'Campaigns',
        path: '/campaigns',
      },
      traineeHelpNavItem,
    ];
  };

  const navItems = getNavItems();

  return (
    <aside
      className="app-sidebar"
      style={{
        width: '64px',
        backgroundColor: 'var(--ip-faint-purple)',
        display: 'flex',
        flexDirection: 'column',
        color: 'var(--ip-deep-purple)',
        flexShrink: 0,
        boxSizing: 'border-box',
        gap: '2px',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      {/* NAV ItEMS */}

      {navItems.map((item) => {
        const NavigationItem = 'href' in item ? 'a' : 'button';
        const isActive =
          'path' in item &&
          (location.pathname === item.path || location.pathname.startsWith(`${item.path}/`));

        return (
          <NavigationItem
            className="app-sidebar__item"
            key={item.label}
            href={'href' in item ? item.href : undefined}
            target={'href' in item ? '_blank' : undefined}
            rel={'href' in item ? 'noopener noreferrer' : undefined}
            onClick={'path' in item ? () => navigate(item.path) : undefined}
            type={'path' in item ? 'button' : undefined}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            title={item.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '64px',
              paddingLeft: '0',
              paddingRight: '0',
              paddingTop: '0',
              paddingBottom: '0',
              flexShrink: 0,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              color: 'var(--ip-deep-purple)',
              transition: '0.22s ease',
              boxSizing: 'border-box',
              background: isActive ? 'rgba(13, 0, 134, 0.1)' : 'none',
              border: 'none',
              borderLeft: isActive ? '4px solid var(--ip-purple)' : '4px solid transparent',
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
                width: '32px',
                height: '32px',
                flexShrink: 0,
              }}
            >
              {item.icon.type && (
                <item.icon.type
                  style={{
                    fontSize: '2rem',
                    width: '2rem',
                    height: '2rem',
                  }}
                />
              )}
            </div>
          </NavigationItem>
        );
      })}
    </aside>
  );
}

export default Sidebar;
