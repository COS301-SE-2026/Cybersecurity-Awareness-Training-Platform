export type DisplayStatus =
  | 'Active'
  | 'Disabled'
  | 'Invited'
  | 'Inactive'
  | 'Failed to Send'
  | 'Accepted'
  | 'Archived'
  | 'Completed'
  | 'Draft'
  | 'Expired'
  | 'Paused'
  | 'Revoked'
  | 'Rejected'
  | 'Unknown'
  | 'New Draft'
  | 'Available'
  | 'Unavailable';

type StatusBadgeProps = Readonly<{
  status: DisplayStatus;
}>;

const variants: Record<DisplayStatus, string> = {
  Active: 'ring-success-subtle text-fg-success-strong bg-success-soft',
  Disabled: 'ring-default-medium text-heading bg-neutral-secondary-medium',
  Invited: 'ring-brand-subtle text-fg-brand-strong bg-brand-softer',
  Inactive: 'ring-default-medium text-heading bg-neutral-secondary-medium',
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
  'New Draft': 'ring-brand-subtle text-fg-brand-strong bg-brand-softer',
  Available: 'ring-success-subtle text-fg-success-strong bg-success-soft',
  Unavailable: 'ring-default-medium text-heading bg-neutral-secondary-medium',
};

function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex w-32 items-center justify-center px-4 py-1 pt-[0.4rem] font-overpass text-base font-medium tracking-[0.05em] ring-2 ring-inset ${variants[status]}`}
    >
      {status}
    </span>
  );
}

export default StatusBadge;
