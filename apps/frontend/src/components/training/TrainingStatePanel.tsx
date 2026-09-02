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
        border: '1px solid var(--ip-bg-purple)',
        backgroundColor: '#FFFFFF',
        boxShadow: '0 8px 24px rgba(70, 0, 151, 0.08)',
        padding: '2rem',
        maxWidth: '52rem',
      }}
    >
      <h2
        style={{
          margin: 0,
          color: 'var(--ip-deep-purple)',
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
          color: '#4B5563',
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
