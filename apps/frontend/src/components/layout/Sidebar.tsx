import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MailOutlined,
  Menu,
  HomeOutlined,
  SchoolOutlined,
  EditOutlined,
} from '@mui/icons-material';

function Sidebar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const navItems = [
    {
      icon: <HomeOutlined />,
      label: 'Dashboard',
      path: '/dashboard',
    },
    {
      icon: <MailOutlined />,
      label: 'Simulated Email Inbox',
      path: '/simulation/inbox',
    },
    {
      icon: <SchoolOutlined />,
      label: 'Training Modules',
      path: '/training/modules',
    },
    {
      icon: <EditOutlined />,
      label: 'Quiz Grades',
      path: '/quiz/grades',
    },
    /*{
      icon: <FeedbackOutlined />,
      label: 'Feedback',
      path: '/feedback',
    },*/
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
      {/* HAMBURGER */}

      <button
        onClick={() => setDrawerOpen(!drawerOpen)}
        style={{
          width: '100%',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: drawerOpen ? 'flex-start' : 'center',
          paddingLeft: drawerOpen ? '1.55rem' : '0',
          marginLeft: '0.2rem',
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

      {/* NAV ITEMS */}

      {navItems.map((item) => (
        <div
          key={item.label}
          onClick={() => navigate(item.path)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: drawerOpen ? 'flex-start' : 'center',
            gap: '1.3rem',
            height: '56px',
            paddingLeft: drawerOpen ? '1.55rem' : '0',
            marginBottom: '1.15rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            color: 'white',
            transition: '0.2s ease',
            boxSizing: 'border-box',
          }}
        >
          {/* ICON */}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '34px',
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
                letterSpacing: '0.01em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {item.label}
            </span>
          )}
        </div>
      ))}
    </aside>
  );
}

export default Sidebar;
