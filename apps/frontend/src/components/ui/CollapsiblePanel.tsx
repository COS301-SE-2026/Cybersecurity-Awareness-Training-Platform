import type { ReactNode } from 'react';

type CollapsiblePanelProps = {
  readonly isOpen: boolean;
  readonly children: ReactNode;
  readonly padding?: string;
  readonly gap?: string;
  readonly duration?: string;
};

export function CollapsiblePanel({
  isOpen,
  children,
  padding = '1rem',
  gap = '1rem',
  duration = '0.35s',
}: CollapsiblePanelProps) {
  return (
    <div
      className="collapsible-panel"
      style={{
        display: 'grid',
        gridTemplateRows: isOpen ? '1fr' : '0fr',
        opacity: isOpen ? 1 : 0,
        transition: `grid-template-rows ${duration} ease, opacity 0.25s ease`,
      }}
    >
      <div
        className="collapsible-panel__clip"
        style={{
          overflow: 'hidden',
        }}
      >
        <div
          className="collapsible-panel__content"
          style={{
            padding,
            display: 'flex',
            flexDirection: 'column',
            gap,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
