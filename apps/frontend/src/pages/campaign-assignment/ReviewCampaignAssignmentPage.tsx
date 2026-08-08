function ReviewCampaignAssignmentPage() {
  return (
    <div className="-mt-5 -ml-4">
      <div className="grid grid-cols-[1fr_auto] mb-4">
        <div>
          {/* PROGRESS HEADING */}
          <h3 className="font-overpass font-regular text-[1.2rem] text-gray-600 tracking-wider font-regular">
            Step 3 of 3
          </h3>

          {/* HEADING */}
          <h3 className="font-jost text-2xl text-dark-pink tracking-wider font-medium">
            Review Campaign Assignment
          </h3>

          {/* SUB-HEADING */}
          <p className="font-regular tracking-wider text-[1.1rem] font-justify font-jost mt-1 text-gray-500 mb-4">
            Review the selected organisation trainees and campaigns before submitting the
            assignments.
          </p>
        </div>

        <div className="flex flex-col items-end">
          <p className="font-regular tracking-wide text-[1.2rem] font-left font-jost text-pink">
            Assigning <span className="font-medium">{'6'}</span> Training Campaign(s) to{' '}
            <span className="font-medium">{'6'}</span> Organisation Trainee(s)
          </p>
          <p className="font-regular tracking-wide text-[1.2rem] font-left font-jost text-pink mb-2">
            <span className="font-medium">{'36'}</span> Total Assignment(s)
          </p>

          <div className="flex gap-4">
            {/* Back Button (TO STEP 1) */}
            <button
              type="button"
              className="cursor-pointer w-40 font-jost tracking-wider text-xl text-body font-regular bg-gray-200 hover:bg-gray-300 leading-5 px-4 py-3 focus:outline-none"
            >
              Back
            </button>

            {/* CONTINUE BUTTON (TO STEP 3) */}
            <button
              type="button"
              className="disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer w-60 font-jost tracking-wider text-xl text-white font-regular bg-main-purple leading-5 px-4 py-3 focus:outline-none"
            >
              Complete Assignment
            </button>
          </div>
        </div>
      </div>

      <div>
        {/* SEARCH AND FILTER BAR */}
        {/* <div className="w-full mb-4">
          <div className="relative bg-white-purple border border-gray-200">
            <div className="flex flex-col items-center justify-between p-4 space-y-3 md:flex-row md:space-y-0 md:space-x-4">
              <button
                type="button"
                className="disabled:hover:bg-gray-200 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer w-60 font-jost tracking-wider text-xl text-body font-regular bg-gray-200 hover:bg-gray-300 leading-5 px-4 py-2.5 focus:outline-none"
              >
                Edit Selections
              </button>
            </div>
          </div>
        </div> */}

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="font-jost text-xl text-purple tracking-wider font-regular mb-1">
              Organisation Trainee Selection ({'6'})
            </h3>
            <div className="relative max-h-[11.80rem] overflow-y-auto overflow-x-auto bg-neutral-primary-soft border border-default">
              {/* SELECTED ORGANISATION TRAINEES TABLE */}
              <table className="w-full min-w-full text-sm text-left rtl:text-right text-body">
                <thead className="bg-faint-purple border-b border-default">
                  <tr>
                    <th
                      scope="col"
                      className="px-3 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                    >
                      Full Name
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                    >
                      Email Address
                    </th>
                  </tr>
                </thead>
                <tbody className="font-overpass font-regular text-[1rem] tracking-wider">
                  <tr className="odd:bg-neutral-primary font-overpass font-light even:bg-neutral-secondary-soft border-b border-default">
                    <td className="truncate max-w-[12rem] px-3 py-3" title="Connor Bell">
                      Connor Bell
                    </td>
                    <td className="truncate max-w-[12rem] px-3 py-3" title="Connor Bell">
                      cbell@cbell.co.za
                    </td>
                  </tr>
                  <tr className="odd:bg-neutral-primary font-overpass font-light even:bg-neutral-secondary-soft border-b border-default">
                    <td className="truncate max-w-[12rem] px-3 py-3" title="Connor Bell">
                      Connor Bell
                    </td>
                    <td className="truncate max-w-[12rem] px-3 py-3" title="Connor Bell">
                      cbell@cbell.co.za
                    </td>
                  </tr>
                  <tr className="odd:bg-neutral-primary font-overpass font-light even:bg-neutral-secondary-soft border-b border-default">
                    <td className="truncate max-w-[12rem] px-3 py-3" title="Connor Bell">
                      Connor Bell
                    </td>
                    <td className="truncate max-w-[12rem] px-3 py-3" title="Connor Bell">
                      cbell@cbell.co.za
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="font-jost text-xl text-purple tracking-wider font-regular mb-1">
              Training Campaign Selection ({'6'})
            </h3>
            {/* SELECTED TRAINING CAMPAIGNS TABLE */}
            <div className="relative max-h-[11.80rem] overflow-y-auto overflow-x-auto bg-neutral-primary-soft border border-default">
              {/* SELECTED ORGANISATION TRAINEES TABLE */}
              <table className="w-full min-w-full text-sm text-left rtl:text-right text-body">
                <thead className="bg-faint-purple border-b border-default">
                  <tr>
                    <th
                      scope="col"
                      className="px-3 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                    >
                      Name
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                    >
                      Description
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                    >
                      Type
                    </th>
                  </tr>
                </thead>
                <tbody className="font-overpass font-regular text-[1rem] tracking-wider">
                  <tr className="odd:bg-neutral-primary font-overpass font-light even:bg-neutral-secondary-soft border-b border-default">
                    <td
                      className="truncate max-w-[6rem] px-3 py-3"
                      title="Phishing Awareness Fundamentals"
                    >
                      Phishing Awareness Fundamentals
                    </td>
                    <td
                      className="truncate max-w-[6rem] px-3 py-3"
                      title="Learn how to identify and respond to common phishing attacks."
                    >
                      Learn how to identify and respond to common phishing attacks.
                    </td>
                    <td className="truncate max-w-[6rem] px-3 py-3" title="Phishing">
                      Phishing
                    </td>
                  </tr>
                  <tr className="odd:bg-neutral-primary font-overpass font-light even:bg-neutral-secondary-soft border-b border-default">
                    <td
                      className="truncate max-w-[6rem] px-3 py-3"
                      title="Phishing Awareness Fundamentals"
                    >
                      Phishing Awareness Fundamentals
                    </td>
                    <td
                      className="truncate max-w-[6rem] px-3 py-3"
                      title="Learn how to identify and respond to common phishing attacks."
                    >
                      Learn how to identify and respond to common phishing attacks.
                    </td>
                    <td className="truncate max-w-[6rem] px-3 py-3" title="Phishing">
                      Phishing
                    </td>
                  </tr>
                  <tr className="odd:bg-neutral-primary font-overpass font-light even:bg-neutral-secondary-soft border-b border-default">
                    <td
                      className="truncate max-w-[6rem] px-3 py-3"
                      title="Phishing Awareness Fundamentals"
                    >
                      Phishing Awareness Fundamentals
                    </td>
                    <td
                      className="truncate max-w-[6rem] px-3 py-3"
                      title="Learn how to identify and respond to common phishing attacks."
                    >
                      Learn how to identify and respond to common phishing attacks.
                    </td>
                    <td className="truncate max-w-[6rem] px-3 py-3" title="Phishing">
                      Phishing
                    </td>
                  </tr>
                  <tr className="odd:bg-neutral-primary font-overpass font-light even:bg-neutral-secondary-soft border-b border-default">
                    <td
                      className="truncate max-w-[6rem] px-3 py-3"
                      title="Phishing Awareness Fundamentals"
                    >
                      Phishing Awareness Fundamentals
                    </td>
                    <td
                      className="truncate max-w-[6rem] px-3 py-3"
                      title="Learn how to identify and respond to common phishing attacks."
                    >
                      Learn how to identify and respond to common phishing attacks.
                    </td>
                    <td className="truncate max-w-[6rem] px-3 py-3" title="Phishing">
                      Phishing
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <h3 className="font-jost text-[1.1rem] text-gray-400 tracking-wide font-regular mt-2 -mb-4">
          <em>To edit your selections, click "Back".</em>
        </h3>
      </div>
    </div>
  );
}

export default ReviewCampaignAssignmentPage;
