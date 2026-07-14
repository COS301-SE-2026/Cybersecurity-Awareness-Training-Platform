function OrganisationTimelinePage() {
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

      {/* <div className="flex flex-col flex-1 w-full grid grid-cols-3 gap-6">

      </div> */}

      <div className="w-full overflow-x-auto -mt-3">
        <div className="min-w-max py-4">
          <ol className="items-center sm:flex">
            {/* TIMELINE ITEM/EVENT 1 */}
            <li className="relative mb-6 sm:mb-0">
              <div className="flex items-center">
                {/* Dot */}
                <div className="z-10 flex items-center justify-center w-3 h-3 bg-main-purple rounded-full ring-0 ring-buffer sm:ring-8 shrink-0"></div>
                {/* Line */}
                <div className="hidden sm:flex w-full bg-gray-300 h-px"></div>
              </div>

              <div className="mt-3 sm:pe-8">
                {/* Date and Time */}
                <time className="bg-neutral-secondary-medium border border-default-medium text-[0.9rem] font-regular text-gray-600 font-overpass px-1.5 pt-1 py-0.5">
                  9 January 2025, 06:00 PM
                </time>

                {/* Event Title */}
                <h3 className="text-lg max-w-3xs font-medium text-pink my-2 tracking-wider font-jost">
                  Organisation Request Submitted
                </h3>

                {/* Event Description */}
                <p className="text-body max-w-3xs mb-4 tracking text-dark-pink font-overpass text-[0.95rem]">
                  The organisation registration request was submitted by the representative.
                </p>
              </div>
            </li>

            {/* TIMELINE ITEM/EVENT 2 */}
            <li className="relative mb-6 sm:mb-0">
              <div className="flex items-center">
                {/* Dot */}
                <div className="z-10 flex items-center justify-center w-3 h-3 bg-main-purple rounded-full ring-0 ring-buffer sm:ring-8 shrink-0"></div>
                {/* Line */}
                <div className="hidden sm:flex w-full bg-gray-300 h-px"></div>
              </div>

              <div className="mt-3 sm:pe-8">
                {/* Date and Time */}
                <time className="bg-neutral-secondary-medium border border-default-medium text-[0.9rem] font-regular text-gray-600 font-overpass px-1.5 pt-1 py-0.5">
                  9 January 2025, 06:00 PM
                </time>

                {/* Event Title */}
                <h3 className="text-lg max-w-3xs font-medium text-pink my-2 tracking-wider font-jost">
                  Organisation Request Submitted
                </h3>

                {/* Event Description */}
                <p className="text-body max-w-3xs mb-4 tracking text-dark-pink font-overpass text-[0.95rem]">
                  The organisation registration request was submitted by the representative.
                </p>
              </div>
            </li>

            {/* TIMELINE ITEM/EVENT 3 */}
            <li className="relative mb-6 sm:mb-0">
              <div className="flex items-center">
                {/* Dot */}
                <div className="z-10 flex items-center justify-center w-3 h-3 bg-main-purple rounded-full ring-0 ring-buffer sm:ring-8 shrink-0"></div>
                {/* Line */}
                <div className="hidden sm:flex w-full bg-gray-300 h-px"></div>
              </div>

              <div className="mt-3 sm:pe-8">
                {/* Date and Time */}
                <time className="bg-neutral-secondary-medium border border-default-medium text-[0.9rem] font-regular text-gray-600 font-overpass px-1.5 pt-1 py-0.5">
                  9 January 2025, 06:00 PM
                </time>

                {/* Event Title */}
                <h3 className="text-lg max-w-3xs font-medium text-pink my-2 tracking-wider font-jost">
                  Organisation Request Submitted
                </h3>

                {/* Event Description */}
                <p className="text-body max-w-3xs mb-4 tracking text-dark-pink font-overpass text-[0.95rem]">
                  The organisation registration request was submitted by the representative.
                </p>
              </div>
            </li>

            {/* TIMELINE ITEM/EVENT 4 */}
            <li className="relative mb-6 sm:mb-0">
              <div className="flex items-center">
                {/* Dot */}
                <div className="z-10 flex items-center justify-center w-3 h-3 bg-main-purple rounded-full ring-0 ring-buffer sm:ring-8 shrink-0"></div>
                {/* Line */}
                <div className="hidden sm:flex w-full bg-gray-300 h-px"></div>
              </div>

              <div className="mt-3 sm:pe-8">
                {/* Date and Time */}
                <time className="bg-neutral-secondary-medium border border-default-medium text-[0.9rem] font-regular text-gray-600 font-overpass px-1.5 pt-1 py-0.5">
                  9 January 2025, 06:00 PM
                </time>

                {/* Event Title */}
                <h3 className="text-lg max-w-3xs font-medium text-pink my-2 tracking-wider font-jost">
                  Organisation Request Submitted
                </h3>

                {/* Event Description */}
                <p className="text-body max-w-3xs mb-4 tracking text-dark-pink font-overpass text-[0.95rem]">
                  The organisation registration request was submitted by the representative.
                </p>
              </div>
            </li>

            {/* TIMELINE ITEM/EVENT 5 */}
            <li className="relative mb-6 sm:mb-0">
              <div className="flex items-center">
                {/* Dot */}
                <div className="z-10 flex items-center justify-center w-3 h-3 bg-main-purple rounded-full ring-0 ring-buffer sm:ring-8 shrink-0"></div>
                {/* Line */}
                <div className="hidden sm:flex w-full bg-gray-300 h-px"></div>
              </div>

              <div className="mt-3 sm:pe-8">
                {/* Date and Time */}
                <time className="bg-neutral-secondary-medium border border-default-medium text-[0.9rem] font-regular text-gray-600 font-overpass px-1.5 pt-1 py-0.5">
                  9 January 2025, 06:00 PM
                </time>

                {/* Event Title */}
                <h3 className="text-lg max-w-3xs font-medium text-pink my-2 tracking-wider font-jost">
                  Organisation Request Submitted
                </h3>

                {/* Event Description */}
                <p className="text-body max-w-3xs mb-4 tracking text-dark-pink font-overpass text-[0.95rem]">
                  The organisation registration request was submitted by the representative.
                </p>
              </div>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default OrganisationTimelinePage;
