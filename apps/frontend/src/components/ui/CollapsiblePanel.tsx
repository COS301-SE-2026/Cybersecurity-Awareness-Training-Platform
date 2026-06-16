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
  duration = '0.34s',
}: CollapsiblePanelProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: isOpen ? '1fr' : '0fr',
        opacity: isOpen ? 1 : 0,
        transition: `grid-template-rows ${duration} ease, opacity 0.25s ease`,
      }}
    >
      <div
        style={{
          overflow: 'hidden',
        }}
      >
        <div
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
