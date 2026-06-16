import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, SchoolOutlined } from '@mui/icons-material';

function Sidebar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const navItems = [
    {
      icon: <SchoolOutlined />,
      label: 'Campaigns',
      path: '/campaigns',
    },
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
