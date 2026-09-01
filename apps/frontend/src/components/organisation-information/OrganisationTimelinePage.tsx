import type { TimelineEventDto } from '@insightful-phish/shared';

// props for organisation event timeline component
// timeline component for rendering chronological audit event log entries

export interface OrganisationTimelineProps {
  timeline?: TimelineEventDto[];
}

const timelineActionLabels: Record<string, string> = {
  CREATED: 'Organisation Created',
  CONTACTED: 'Representative Contacted',
  APPROVED: 'Registration Approved',
  REJECTED: 'Registration Rejected',
  RESENT: 'Setup Invite Resent',
  ACCEPTED: 'Invite Accepted',
  COMPLETED: 'Setup Completed',
  ENABLED: 'Organisation Enabled',
  SUSPENDED: 'Organisation Suspended',
  REACTIVATED: 'Organisation Reactivated',
};

function formatTimelineAction(action: string): string {
  if (timelineActionLabels[action]) {
    return timelineActionLabels[action];
  }
  return action
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function OrganisationTimelinePage({ timeline }: Readonly<OrganisationTimelineProps>) {
  const hasTimelineEvents = Boolean(timeline && timeline.length > 0);

  if (!hasTimelineEvents) {
    return (
      <div className="-mt-2 -ml-2 font-overpass">
        <h3 className="font-jost text-2xl text-dark-pink tracking-wider font-medium">
          Organisation Event Timeline
        </h3>
        <p className="font-regular tracking-wider text-[1.1rem] font-justify font-jost text-gray-500 mb-6">
          View the chronological history of organisation registration, onboarding, and platform
          events.
        </p>
        <div className="p-4 bg-gray-50 border border-gray-200 text-gray-600 rounded-none">
          No timeline events recorded for this organisation yet.
        </div>
      </div>
    );
  }

  const eventsToDisplay = (timeline ?? []).map((item) => ({
    id: item.id,
    timestamp: new Date(item.timestamp).toLocaleString(),
    action: formatTimelineAction(item.action),
    summary: item.summary,
    actor: item.actor,
  }));

  return (
    <div className="-mt-2 -ml-2">
      {/* HEADING */}
      <h3 className="font-jost text-2xl text-dark-pink tracking-wider font-medium">
        Organisation Event Timeline
      </h3>

      {/* SUB-HEADING */}
      <p className="font-regular tracking-wider text-[1.1rem] font-justify font-jost text-gray-500 mb-6">
        View the chronological history of organisation registration, onboarding, and platform
        events.
      </p>

      <div className="w-full overflow-x-auto -mt-3">
        <div className="min-w-max py-4">
          <ol className="items-start sm:flex">
            {eventsToDisplay.map((event, index) => (
              <li key={event.id || index} className="relative mb-6 sm:mb-0 sm:flex-1 min-w-[14rem]">
                <div className="flex items-center">
                  {/* Dot */}
                  <div className="z-10 flex items-center justify-center w-3 h-3 bg-main-purple rounded-none ring-0 ring-buffer sm:ring-8 shrink-0"></div>
                  {/* Line */}
                  {index < eventsToDisplay.length - 1 && (
                    <div className="hidden sm:flex w-full bg-gray-300 h-px"></div>
                  )}
                </div>

                <div className="mt-3 sm:pe-8">
                  {/* Date and Time */}
                  <time className="bg-neutral-secondary-medium border border-default-medium text-[0.9rem] font-regular text-gray-600 font-overpass px-1.5 pt-1 py-0.5 rounded-none">
                    {event.timestamp}
                  </time>

                  {/* Event Title */}
                  <h3 className="text-lg max-w-3xs font-medium text-pink my-2 tracking-wider font-jost">
                    {event.action}
                  </h3>

                  {/* Event Description */}
                  <p className="text-body max-w-3xs mb-2 tracking text-dark-pink font-overpass text-[0.95rem]">
                    {event.summary}
                  </p>

                  {/* Actor context */}
                  {event.actor && (
                    <p className="text-xs text-gray-500 font-overpass">Actor: {event.actor}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

export default OrganisationTimelinePage;
