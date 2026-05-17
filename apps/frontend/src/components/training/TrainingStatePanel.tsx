import type { ReactNode } from 'react';

interface TrainingStatePanelProps {
  title: string;
  message: string;
  action?: ReactNode;
}

export function TrainingStatePanel({ title, message, action }: TrainingStatePanelProps) {
  return (
    <section
      style={{
        border: '1px solid rgba(132, 0, 255, 0.7)',
        backgroundColor: 'rgba(31, 0, 71, 0.72)',
        boxShadow: '0 0 22px rgba(132, 0, 255, 0.22)',
        padding: '2rem',
        maxWidth: '52rem',
      }}
    >
      <h2
        style={{
          margin: 0,
          color: '#FFFFFF',
          fontFamily: 'Jost',
          fontSize: '2rem',
          fontWeight: 500,
        }}
      >
        {title}
      </h2>

      <p
        style={{
          margin: '0.8rem 0 0',
          color: '#D8C7FF',
          fontFamily: 'Overpass',
          fontSize: '1rem',
          lineHeight: 1.7,
        }}
      >
        {message}
      </p>

      {action ? <div style={{ marginTop: '1.4rem' }}>{action}</div> : null}
    </section>
  );
}
