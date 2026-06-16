import { useState } from 'react';

import { KeyboardArrowDown, KeyboardArrowUp, LockOutlined } from '@mui/icons-material';

type TrainingPartAccordionProps = {
  readonly title: string;
  readonly status: string;
  readonly children: React.ReactNode;
  readonly defaultOpen?: boolean;
  readonly disabled?: boolean;
};

function TrainingPartAccordion({
  title,
  status,
  children,
  defaultOpen = false,
  disabled = false,
}: TrainingPartAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  const renderIcon = () => {
    if (disabled) {
      return (
        <LockOutlined
          style={{
            color: '#8E63B3',
            fontSize: '2rem',
          }}
        />
      );
    }

    if (open) {
      return (
        <KeyboardArrowUp
          style={{
            color: '#C98FFF',
            fontSize: '2.4rem',
          }}
        />
      );
    }

    return (
      <KeyboardArrowDown
        style={{
          color: '#C98FFF',
          fontSize: '2.4rem',
        }}
      />
    );
  };

  return (
    <div
      style={{
        backgroundColor: 'rgba(49, 0, 90, 0.55)',
      }}
    >
      {/* HEADER */}

      <button
        onClick={disabled ? undefined : () => setOpen(!open)}
        disabled={disabled}
        type="button"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.2rem 1.6rem',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.65 : 1,
          background: 'none',
          border: 'none',
          width: '100%',
          textAlign: 'left',
          boxSizing: 'border-box',
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

          {renderIcon()}
        </div>
      </button>

      {/* CONTENT */}

      <div
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          opacity: open ? 1 : 0,
          transition: 'grid-template-rows 0.35s ease, opacity 0.25s ease',
        }}
      >
        <div
          style={{
            overflow: 'hidden',
          }}
        >
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
        </div>
      </div>
    </div>
  );
}

export default TrainingPartAccordion;
