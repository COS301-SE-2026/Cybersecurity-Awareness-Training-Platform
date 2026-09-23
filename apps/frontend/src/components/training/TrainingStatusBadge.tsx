import type { TrainingDocumentStatus } from '../../lib/trainingApi';
import StatusBadge, { type DisplayStatus } from '../ui/StatusBadge';

interface TrainingStatusBadgeProps {
  readonly status: TrainingDocumentStatus;
}

const statusLabels: Record<TrainingDocumentStatus, DisplayStatus> = {
  NOT_STARTED: 'Not Started',
  STARTED: 'In Progress',
  VIEWED: 'In Progress',
  COMPLETED: 'Completed',
};

export function TrainingStatusBadge({ status }: TrainingStatusBadgeProps) {
  return <StatusBadge status={statusLabels[status]} />;
}
