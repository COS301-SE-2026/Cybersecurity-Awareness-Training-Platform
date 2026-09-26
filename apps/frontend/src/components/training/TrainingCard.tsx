import { Link } from 'react-router-dom';
import type { TrainingDocumentSummary, TrainingDocumentStatus } from '../../lib/trainingApi';
import { trainingRoutes } from '../../lib/trainingApi';
import StatusBadge, { type DisplayStatus } from '../ui/StatusBadge';

interface TrainingCardProps {
  trainingDocument: TrainingDocumentSummary;
}

const trainingStatusLabels: Record<TrainingDocumentStatus, DisplayStatus> = {
  NOT_STARTED: 'Not Started',
  STARTED: 'In Progress',
  VIEWED: 'In Progress',
  COMPLETED: 'Completed',
};

export function TrainingCard({ trainingDocument }: TrainingCardProps) {
  return (
    <article
      style={{
        border: '1px solid rgba(255, 0, 212, 0.55)',
        borderLeft: '5px solid #FF00D4',
        backgroundColor: 'rgba(31, 0, 71, 0.78)',
        boxShadow: '0 0 20px rgba(255, 0, 212, 0.12)',
        padding: '1.4rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '1rem',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              color: '#FFFFFF',
              fontFamily: 'Jost',
              fontSize: '1.75rem',
              fontWeight: 500,
            }}
          >
            {trainingDocument.title}
          </h2>

          <p
            style={{
              margin: '0.7rem 0 0',
              color: '#D8C7FF',
              fontFamily: 'Overpass',
              fontSize: '1rem',
              lineHeight: 1.6,
              maxWidth: '54rem',
            }}
          >
            {trainingDocument.description}
          </p>
        </div>

        <StatusBadge status={trainingStatusLabels[trainingDocument.status]} />
      </div>

      <Link
        to={trainingRoutes.document(trainingDocument.id)}
        className="mt-5 inline-flex cursor-pointer items-center justify-center gap-2 bg-main-purple px-4 py-3 font-jost text-xl leading-5 font-regular tracking-wider text-white no-underline hover:bg-hover-purple focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--ip-faint-purple)]"
      >
        Open Training
      </Link>
    </article>
  );
}
