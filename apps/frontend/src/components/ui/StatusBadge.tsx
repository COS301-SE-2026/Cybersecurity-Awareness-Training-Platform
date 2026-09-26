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
  | 'Unavailable'
  | 'In Progress'
  | 'Not Started'
  | 'Enrolled'
  | 'Correct'
  | 'Incorrect'
  | 'Needs Review'
  | 'Pending upgrade'
  | 'Failed invitation'
  | 'Unknown status'
  | 'Passed'
  | 'Not Passed'
  | 'Pending Review'
  | 'Contacted'
  | 'Approved'
  | 'Cancelled'
  | 'Approved - Setup Pending'
  | 'Approved - Waiting For Setup'
  | 'Onboarding'
  | 'Setup Email Failed'
  | 'Setup Token Expired'
  | 'Suspended';

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
  'In Progress': 'ring-brand-subtle text-fg-brand-strong bg-brand-softer',
  'Not Started': 'ring-default-medium text-heading bg-neutral-secondary-medium',
  Enrolled: 'ring-brand-subtle text-fg-brand-strong bg-brand-softer',
  Correct: 'ring-success-subtle text-fg-success-strong bg-success-soft',
  Incorrect: 'ring-danger-subtle text-fg-danger-strong bg-danger-soft',
  'Needs Review': 'ring-warning-subtle text-fg-warning bg-warning-soft',
  'Pending upgrade': 'ring-brand-subtle text-fg-brand-strong bg-brand-softer',
  'Failed invitation': 'ring-danger-subtle text-fg-danger-strong bg-danger-soft',
  'Unknown status': 'ring-default-medium text-fg-heading bg-neutral-secondary-medium',
  Passed: 'ring-success-subtle text-fg-success-strong bg-success-soft',
  'Not Passed': 'ring-danger-subtle text-fg-danger-strong bg-danger-soft',
  'Pending Review': 'ring-warning-subtle text-fg-warning bg-warning-soft',
  Contacted: 'ring-brand-subtle text-fg-brand-strong bg-brand-softer',
  Approved: 'ring-success-subtle text-fg-success-strong bg-success-soft',
  Cancelled: 'ring-danger-subtle text-fg-danger-strong bg-danger-soft',
  'Approved - Setup Pending': 'ring-warning-subtle text-fg-warning bg-warning-soft',
  'Approved - Waiting For Setup': 'ring-warning-subtle text-fg-warning bg-warning-soft',
  Onboarding: 'ring-brand-subtle text-fg-brand-strong bg-brand-softer',
  'Setup Email Failed': 'ring-danger-subtle text-fg-danger-strong bg-danger-soft',
  'Setup Token Expired': 'ring-danger-subtle text-fg-danger-strong bg-danger-soft',
  Suspended: 'ring-danger-subtle text-fg-danger-strong bg-danger-soft',
};

function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex min-w-32 items-center justify-center whitespace-nowrap px-4 py-1 pt-[0.4rem] font-overpass text-base font-medium tracking-[0.05em] ring-2 ring-inset ${variants[status]}`}
    >
      {status}
    </span>
  );
}

export default StatusBadge;
