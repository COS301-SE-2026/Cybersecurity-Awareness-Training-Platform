export type AlertVariant = 'info' | 'danger' | 'success' | 'warning' | 'default';

export const AlertVariants = {
  info: {
    container: 'text-fg-brand-strong bg-brand-softer border-brand-subtle',
    button: 'hover:bg-brand-soft focus:ring-brand-medium',
  },

  danger: {
    container: 'text-fg-danger-strong bg-danger-soft border-danger-subtle',
    button: 'bg-danger-soft hover:bg-danger-medium focus:ring-danger-medium',
  },

  success: {
    container: 'text-fg-success-strong bg-success-soft border-success-subtle',
    button: 'hover:bg-success-medium focus:ring-success-medium',
  },

  warning: {
    container: 'text-fg-warning bg-warning-soft border-warning-subtle',
    button: 'hover:bg-warning-medium focus:ring-warning-medium',
  },

  default: {
    container: 'text-heading bg-neutral-secondary-medium border-default-medium',
    button: 'hover:bg-neutral-tertiary-medium focus:ring-neutral-tertiary',
  },
};
