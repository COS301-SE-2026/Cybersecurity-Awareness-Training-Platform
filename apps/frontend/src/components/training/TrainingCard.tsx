import { Link } from 'react-router-dom';
import type { TrainingDocumentSummary } from '../../lib/trainingApi';
import { trainingRoutes } from '../../lib/trainingApi';
import { TrainingStatusBadge } from './TrainingStatusBadge';

interface TrainingCardProps {
  trainingDocument: TrainingDocumentSummary;
}

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

        <TrainingStatusBadge status={trainingDocument.status} />
      </div>

      <Link
        to={trainingRoutes.document(trainingDocument.id)}
        style={{
          display: 'inline-flex',
          marginTop: '1.3rem',
          padding: '0.85rem 1.2rem',
          backgroundColor: '#8400FF',
          color: '#FFFFFF',
          border: '1px solid #FF00D4',
          textDecoration: 'none',
          fontFamily: 'Jost',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        Open Training
      </Link>
    </article>
  );
}
