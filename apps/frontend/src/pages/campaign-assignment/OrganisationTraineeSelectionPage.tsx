function OrganisationTraineeSelectionPage() {
  return (
    <div className="-mt-5 -ml-4">
      {/* PROGRESS HEADING */}
      <h3 className="font-overpass font-regular text-[1.2rem] text-gray-600 tracking-wider font-regular">
        Step 1 of 3
      </h3>

      {/* HEADING */}
      <h3 className="font-jost text-2xl text-dark-pink tracking-wider font-medium">
        Organisation Trainee Selection
      </h3>

      {/* SUB-HEADING */}
      <p className="font-regular tracking-wider text-[1.1rem] font-justify font-jost mt-1 text-gray-500 mb-4">
        Select the organisation trainees you wish to assign campaigns to.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-6"></div>
    </div>
  );
}

export default OrganisationTraineeSelectionPage;
