export type DisplayStatus =
  | 'Active'
  | 'Disabled'
  | 'Invited'
  | 'Failed to Send'
  | 'Accepted'
  | 'Archived'
  | 'Completed'
  | 'Draft'
  | 'Expired'
  | 'Paused'
  | 'Revoked'
  | 'Rejected'
  | 'Unknown';

type StatusBadgeProps = Readonly<{
  status: DisplayStatus;
}>;

const variants: Record<DisplayStatus, string> = {
  Active: 'ring-success-subtle text-fg-success-strong bg-success-soft',
  Disabled: 'ring-default-medium text-heading bg-neutral-secondary-medium',
  Invited: 'ring-brand-subtle text-fg-brand-strong bg-brand-softer',
  'Failed to Send': 'ring-danger-subtle text-fg-danger-strong bg-danger-soft',
  Accepted: 'ring-success-subtle text-fg-success-strong bg-success-soft',
  Archived: 'ring-default-medium text-heading bg-neutral-secondary-medium',
  Completed: 'ring-success-subtle text-fg-success-strong bg-success-soft',
  Draft: 'ring-brand-subtle text-fg-brand-strong bg-brand-softer',
  Expired: 'ring-default-medium text-heading bg-neutral-secondary-medium',
  Paused: 'ring-warning-subtle text-fg-warning bg-warning-soft',
  Revoked: 'ring-danger-subtle text-fg-danger-strong bg-danger-soft',
  Rejected: 'ring-warning-subtle text-fg-warning bg-warning-soft',
  Unknown: 'ring-default-medium text-fg-heading bg-neutral-secondary-medium',
};

function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`items-flex justify-center items-center w-32 px-4 py-1 pt-[0.4rem] ring-2 ring-inset text-sm font-medium ${variants[status]}`}
    >
      {status}
    </span>
  );
}

export default StatusBadge;
