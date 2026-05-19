import { useState } from 'react';

import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';

type CampaignAccordionProps = {
  title: string;
  subtitle: string;
  status: string;
  accentColor: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

function CampaignAccordion({
  title,
  subtitle,
  status,
  accentColor,
  children,
  defaultOpen = false,
}: CampaignAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        border: `4px solid ${accentColor}33`,
        backgroundColor: `${accentColor}13`,
        position: 'relative',
        overflow: 'visible',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '-6px',
          top: '-4px',
          width: '12px',
          height: 'calc(100% + 8px)',
          backgroundColor: accentColor,
          zIndex: 50,
          pointerEvents: 'none',
        }}
      />
      {/* HEADER */}

      <div
        onClick={() => setOpen(!open)}
        style={{
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.6rem 1.8rem',
        }}
      >
        <div>
          <div
            style={{
              color: 'white',
              fontFamily: 'Overpass',
              fontSize: '1.5rem',
              fontWeight: 400,
              marginBottom: '0.2rem',
              letterSpacing: '0.08rem',
            }}
          >
            {title}
          </div>

          <div
            style={{
              color: accentColor,
              fontFamily: 'Jost',
              fontSize: '2.8rem',
              fontWeight: 500,
              lineHeight: 1,
              letterSpacing: '0.08rem',
            }}
          >
            {subtitle}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2rem',
          }}
        >
          <div
            style={{
              backgroundColor: `${accentColor}22`,
              color: accentColor,
              width: '180px',
              height: '56px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'Jost',
              fontWeight: 500,
              fontSize: '1.1rem',
              letterSpacing: '0.1em',
              boxSizing: 'border-box',
            }}
          >
            {status}
          </div>

          {open ? (
            <KeyboardArrowUp
              style={{
                color: 'white',
                fontSize: '3rem',
              }}
            />
          ) : (
            <KeyboardArrowDown
              style={{
                color: 'white',
                fontSize: '3rem',
              }}
            />
          )}
        </div>
      </div>

      {/* CONTENT */}

      {open && (
        <div
          style={{
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export default CampaignAccordion;
