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
  const campaignStyle = {
    '--campaign-accent': accentColor,
    '--campaign-accent-soft': `${accentColor}22`,
    '--campaign-border': `${accentColor}33`,
  } as React.CSSProperties;

  return (
    <div className="campaign-accordion" style={campaignStyle}>
      <div className="campaign-accordion__accent" />

      <button
        className="campaign-accordion__header"
        onClick={onToggle}
        type="button"
        aria-expanded={isOpen}
      >
        <div className="campaign-accordion__heading">
          <div className="campaign-accordion__eyebrow">{title}</div>
          <div className="campaign-accordion__title">{subtitle}</div>

          <dl className="campaign-accordion__metadata">
            <div>
              <dt>Starts</dt>
              <dd>{startDate}</dd>
            </div>
            <div>
              <dt>Deadline</dt>
              <dd>{deadline}</dd>
            </div>
          </dl>
        </div>

        <div className="campaign-accordion__summary">
          <div className="campaign-accordion__state">
            <div className="campaign-accordion__status">{status}</div>
            <div className="campaign-accordion__next-action">
              <span className="campaign-accordion__next-label">Next</span>
              <span className="campaign-accordion__next-value">{nextAction}</span>
            </div>
          </div>

          {isOpen ? (
            <KeyboardArrowUp className="campaign-accordion__toggle-icon" />
          ) : (
            <KeyboardArrowDown className="campaign-accordion__toggle-icon" />
          )}
        </div>
      </button>

      <CollapsiblePanel isOpen={isOpen} padding="0.75rem" gap="0.75rem" duration="0.36s">
        {children}
      </CollapsiblePanel>
    </div>
  );
}

export default CampaignAccordion;
