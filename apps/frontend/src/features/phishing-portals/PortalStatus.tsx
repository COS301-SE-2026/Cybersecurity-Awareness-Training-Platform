import type { ResolvePhishingPortalResponse } from '@insightful-phish/shared';
import { PortalLayout } from './PortalLayout';

type PortalStatusState = 'LOADING' | Exclude<ResolvePhishingPortalResponse['state'], 'ACTIVE'>;

type PortalStatusProps = Readonly<{
  state: PortalStatusState;
}>;

const statusMessages = {
  LOADING: {
    heading: 'Loading portal',
    description: 'Please wait while we check this link.',
  },
  UNAVAILABLE: {
    heading: 'Portal unavailable',
    description: 'This link cannot be opened. You can close this page.',
  },
  INACTIVE: {
    heading: 'This simulation link is no longer active',
    description: 'You do not need to enter any information. You can close this page.',
  },
} as const satisfies Record<PortalStatusState, { heading: string; description: string }>;

export function PortalStatus({ state }: PortalStatusProps) {
  const message = statusMessages[state];
  const isLoading = state === 'LOADING';

  return (
    <PortalLayout heading={message.heading} focusHeading={isLoading !== true} isBusy={isLoading}>
      {isLoading === true && <div className="phishing-portal__loader" aria-hidden="true" />}
      <p className="phishing-portal__status" role="status" aria-atomic="true">
        {message.description}
      </p>
    </PortalLayout>
  );
}
