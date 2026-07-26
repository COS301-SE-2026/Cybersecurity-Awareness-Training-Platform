import type { TimelineEventDto } from '@insightful-phish/shared';

// props for organisation event timeline component
// timeline component for rendering chronological audit event log entries

export interface OrganisationTimelineProps {
  timeline?: TimelineEventDto[];
}

function OrganisationTimelinePage({ timeline }: OrganisationTimelineProps) {
  // default timeline events for fallback testing
  const eventsToDisplay: Array<{
    id: string;
    timestamp: string;
    action: string;
    summary: string;
  }> =
    timeline && timeline.length > 0
      ? timeline.map((item) => ({
          id: item.id,
          timestamp: new Date(item.timestamp).toLocaleString(),
          action: item.action,
          summary: item.summary,
        }))
      : [
          {
            id: '1',
            timestamp: '19 June 2026, 06:00 PM',
            action: 'Organisation Request Submitted',
            summary:
              'The organisation registration request was submitted by representative Jan van der Merwe.',
          },
          {
            id: '2',
            timestamp: '20 June 2026, 07:00 PM',
            action: 'Organisation Request Declined',
            summary:
              'The organisation registration request was declined by the Insightful Phish platform administrator.',
          },
        ];

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
          <ol className="items-center sm:flex">
            {eventsToDisplay.map((event, index) => (
              <li key={event.id || index} className="relative mb-6 sm:mb-0">
                <div className="flex items-center">
                  {/* Dot */}
                  <div className="z-10 flex items-center justify-center w-3 h-3 bg-main-purple rounded-none ring-0 ring-buffer sm:ring-8 shrink-0"></div>
                  {/* Line */}
                  <div className="hidden sm:flex w-full bg-gray-300 h-px"></div>
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
                  <p className="text-body max-w-3xs mb-4 tracking text-dark-pink font-overpass text-[0.95rem]">
                    {event.summary}
                  </p>
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
