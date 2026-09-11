import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import { CollapsiblePanel } from './CollapsiblePanel';

type CampaignAccordionProps = {
  readonly title: string;
  readonly subtitle: string;
  readonly status: string;
  readonly startDate: string;
  readonly deadline: string;
  readonly nextAction: string;
  readonly accentColor: string;
  readonly children?: React.ReactNode;
  readonly isOpen: boolean;
  readonly onToggle: () => void;
};

function CampaignAccordion({
  title,
  subtitle,
  status,
  startDate,
  deadline,
  nextAction,
  accentColor,
  children,
  isOpen,
  onToggle,
}: CampaignAccordionProps) {
  return (
    <div
      className="campaign-accordion"
      style={{
        border: `4px solid ${accentColor}33`,
        backgroundColor: 'white',
        position: 'relative',
        overflow: 'visible',
      }}
    >
      <div
        className="campaign-accordion__accent"
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
        className="campaign-accordion__header"
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
        <div className="campaign-accordion__heading">
          <div
            className="campaign-accordion__eyebrow"
            style={{
              color: 'var(--ip-deep-purple)',
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
            className="campaign-accordion__title"
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

          <dl
            className="campaign-accordion__metadata"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem 1.5rem',
              margin: '0.9rem 0 0',
              color: 'var(--ip-deep-purple)',
              fontFamily: 'Overpass',
            }}
          >
            <div>
              <dt
                className="font-jost tracking-wider"
                style={{
                  display: 'inline',
                  fontWeight: 500,
                  marginRight: '0.45rem',
                }}
              >
                Starts
              </dt>
              <dd
                className="font-google_sans_code text-gray-600"
                style={{ display: 'inline', margin: 0 }}
              >
                {startDate}
              </dd>
            </div>

            <div>
              <dt
                className="font-jost tracking-wider"
                style={{
                  display: 'inline',
                  fontWeight: 500,
                  marginRight: '0.45rem',
                }}
              >
                Deadline
              </dt>
              <dd
                className="font-google_sans_code text-gray-600"
                style={{ display: 'inline', margin: 0 }}
              >
                {deadline}
              </dd>
            </div>
          </dl>
        </div>

        <div
          className="campaign-accordion__summary"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(180px, max-content) 3rem',
            gridTemplateRows: '1fr auto auto 1fr',
            columnGap: '2rem',
            rowGap: '0.4rem',
            alignItems: 'center',
            alignSelf: 'stretch',
            justifyItems: 'end',
          }}
        >
          <div
            className="campaign-accordion__state"
            style={{
              display: 'contents',
            }}
          >
            <div
              className="campaign-accordion__status"
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
                gridColumn: 1,
                gridRow: 2,
              }}
            >
              {status}
            </div>

            <div
              className="campaign-accordion__next-action"
              style={{
                color: 'var(--ip-deep-purple)',
                fontFamily: 'Overpass',
                textAlign: 'right',
                gridColumn: 1,
                gridRow: 3,
              }}
            >
              <span
                className="font-jost tracking-wider"
                style={{ fontWeight: 500, marginRight: '0.45rem' }}
              >
                Next
              </span>
              <span className="font-google_sans_code text-gray-600">{nextAction}</span>
            </div>
          </div>

          {isOpen ? (
            <KeyboardArrowUp
              className="campaign-accordion__toggle-icon"
              style={{
                color: 'var(--ip-deep-purple)',
                fontSize: '3rem',
                gridColumn: 2,
                gridRow: 2,
              }}
            />
          ) : (
            <KeyboardArrowDown
              className="campaign-accordion__toggle-icon"
              style={{
                color: 'var(--ip-deep-purple)',
                fontSize: '3rem',
                gridColumn: 2,
                gridRow: 2,
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
