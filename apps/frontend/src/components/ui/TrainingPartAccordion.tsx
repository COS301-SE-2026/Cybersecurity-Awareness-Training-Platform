import { useState } from 'react';

import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';

type TrainingPartAccordionProps = {
  title: string;
  status: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

function TrainingPartAccordion({
  title,
  status,
  children,
  defaultOpen = false,
}: TrainingPartAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        backgroundColor: 'rgba(49, 0, 90, 0.55)',
      }}
    >
      {/* HEADER */}

      <div
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.2rem 1.6rem',
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            color: 'white',
            fontFamily: 'Jost',
            fontSize: '1.8rem',
            letterSpacing: '0.08rem',
            fontWeight: 400,
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
          }}
        >
          <div
            style={{
              color: '#C98FFF',
              fontFamily: 'Jost',
              fontSize: '1.1rem',
              letterSpacing: '0.08rem',
              fontWeight: 500,
            }}
          >
            {status}
          </div>

          {open ? (
            <KeyboardArrowUp
              style={{
                color: '#C98FFF',
                fontSize: '2.4rem',
              }}
            />
          ) : (
            <KeyboardArrowDown
              style={{
                color: '#C98FFF',
                fontSize: '2.4rem',
              }}
            />
          )}
        </div>
      </div>

      {/* CONTENT */}

      {open && (
        <div
          style={{
            padding: '0 1.6rem 1.4rem 1.6rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.8rem',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export default TrainingPartAccordion;
