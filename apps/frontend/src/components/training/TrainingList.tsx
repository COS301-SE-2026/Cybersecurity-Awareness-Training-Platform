import type { TrainingDocumentSummary } from '../../lib/trainingApi';
import { TrainingCard } from './TrainingCard';

interface TrainingListProps {
  trainingDocuments: TrainingDocumentSummary[];
}

export function TrainingList({ trainingDocuments }: TrainingListProps) {
  return (
    <div
      style={{
        display: 'grid',
        gap: '1.2rem',
      }}
    >
      {trainingDocuments.map((trainingDocument) => (
        <TrainingCard key={trainingDocument.id} trainingDocument={trainingDocument} />
      ))}
    </div>
  );
}
