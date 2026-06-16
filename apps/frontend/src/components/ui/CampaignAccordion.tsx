import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import { CollapsiblePanel } from './CollapsiblePanel';

type CampaignAccordionProps = {
  readonly title: string;
  readonly subtitle: string;
  readonly status: string;
  readonly accentColor: string;
  readonly children?: React.ReactNode;
  readonly isOpen: boolean;
  readonly onToggle: () => void;
};

function CampaignAccordion({
  title,
  subtitle,
  status,
  accentColor,
  children,
  isOpen,
  onToggle,
}: CampaignAccordionProps) {
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

      <button
        onClick={onToggle}
        type="button"
        style={{
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.6rem 1.8rem',
          background: 'none',
          border: 'none',
          width: '100%',
          textAlign: 'left',
          boxSizing: 'border-box',
        }}
      >
        <div>
          <div
            style={{
              color: 'white',
              fontFamily: 'Overpass',
              fontSize: '1.6rem',
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
              fontSize: '2.82rem',
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
              fontSize: '1.12rem',
              letterSpacing: '0.1em',
              boxSizing: 'border-box',
            }}
          >
            {status}
          </div>

          {isOpen ? (
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
      </button>

      {/* CONTENT */}

      <CollapsiblePanel isOpen={isOpen} padding="1rem" gap="1rem" duration="0.36s">
        {children}
      </CollapsiblePanel>
    </div>
  );
}

export default CampaignAccordion;
