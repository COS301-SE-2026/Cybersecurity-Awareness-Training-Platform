import type { CSSProperties } from 'react';
import type { TrainingDocumentStatus } from '../../lib/trainingApi';

interface TrainingStatusBadgeProps {
  readonly status: TrainingDocumentStatus;
}

const statusLabels: Record<TrainingDocumentStatus, string> = {
  NOT_STARTED: 'Not Started',
  STARTED: 'Started',
  VIEWED: 'Viewed',
  COMPLETED: 'Completed',
};

const statusStyles: Record<TrainingDocumentStatus, CSSProperties> = {
  NOT_STARTED: {
    color: '#FFB7EF',
    borderColor: '#FF00D4',
    backgroundColor: 'rgba(255, 0, 212, 0.12)',
  },
  STARTED: {
    color: '#AEEAFF',
    borderColor: '#00BBFF',
    backgroundColor: 'rgba(0, 187, 255, 0.12)',
  },
  VIEWED: {
    color: '#CDAEFF',
    borderColor: '#8400FF',
    backgroundColor: 'rgba(132, 0, 255, 0.16)',
  },
  COMPLETED: {
    color: '#B7FFD9',
    borderColor: '#00FFA6',
    backgroundColor: 'rgba(0, 255, 166, 0.12)',
  },
};

export function TrainingStatusBadge({ status }: TrainingStatusBadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        border: '1px solid',
        borderRadius: '999px',
        padding: '0.45rem 0.9rem',
        fontFamily: 'Jost',
        fontSize: '0.82rem',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        ...statusStyles[status],
      }}
    >
      {statusLabels[status]}
    </span>
  );
}
