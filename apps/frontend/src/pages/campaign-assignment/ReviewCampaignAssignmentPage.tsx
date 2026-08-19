import type {
  AssignableCampaignOptionDto,
  CampaignAssignmentCandidateOptionDto,
} from '@insightful-phish/shared';
import { useState } from 'react';
import { useAuth } from '../../context/useAuth';
import { createCampaignAssignments } from '../../services/campaign-assignment.service';
import LoadingSpinnerSVG from '../../components/LoadingSpinnerSVG';
import BasicAlert from '../../components/alerts/BasicAlert';

type ReviewCampaignAssignmentPageProps = Readonly<{
  selectedTraineeIds: string[];
  selectedCampaignIds: string[];
  selectedTrainees: CampaignAssignmentCandidateOptionDto[];
  selectedCampaigns: AssignableCampaignOptionDto[];
  onBack: () => void;
}>;

function ReviewCampaignAssignmentPage({
  selectedTraineeIds,
  selectedCampaignIds,
  selectedTrainees,
  selectedCampaigns,
  onBack,
}: ReviewCampaignAssignmentPageProps) {
  const traineeCount = selectedTraineeIds.length; // # Trainees
  const campaignCount = selectedCampaignIds.length; // # Campaigns
  const assignmentCount = traineeCount * campaignCount; // Total Assignments

  const { authContext } = useAuth();
  const organisationId = authContext?.organisation?.id ?? null;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState<string | null>(null);

  const handleCompleteAssignment = async () => {
    if (!organisationId || traineeCount === 0 || campaignCount === 0) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createCampaignAssignments(organisationId, {
        campaignIds: selectedCampaignIds,
        traineeProfileIds: selectedTraineeIds,
      });
    } catch {
      setError('Unable To Complete Campaign Assignment. Please Try Again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <>
      {error && (
        <BasicAlert variant="danger" onClose={() => setError(null)}>
          {error}
        </BasicAlert>
      )}

      {success && (
        <BasicAlert variant="success" onClose={() => setSuccess(null)}>
          {success}
        </BasicAlert>
      )}

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
              Assigning {campaignCount} Training Campaign(s) to {traineeCount} Organisation
              Trainee(s)
            </p>
            <p className="font-regular tracking-wide text-[1.2rem] font-left font-jost text-pink mb-2">
              {assignmentCount} Total Assignment(s)
            </p>

            <div className="flex gap-4">
              {/* Back Button (TO STEP 1) */}
              <button
                type="button"
                onClick={onBack}
                className="cursor-pointer w-40 font-jost tracking-wider text-xl text-body font-regular bg-gray-200 hover:bg-gray-300 leading-5 px-4 py-3 focus:outline-none"
              >
                Back
              </button>

              {/* CONTINUE BUTTON (TO STEP 3) */}
              <button
                type="button"
                disabled={
                  traineeCount === 0 || campaignCount === 0 || isSubmitting || !organisationId
                }
                onClick={() => void handleCompleteAssignment()}
                className="disabled:opacity-20 inline-flex gap-2 items-center justify-center disabled:cursor-not-allowed cursor-pointer w-60 font-jost tracking-wider text-xl text-white font-regular bg-main-purple leading-5 px-4 py-3 focus:outline-none"
              >
                {isSubmitting && <LoadingSpinnerSVG />}
                <span>{isSubmitting ? 'Assigning...' : 'Complete Assignment'}</span>
              </button>
            </div>
          </div>
        </div>
        {/* // SHOW {error} USING BASIC ALERT PLEASE!!!! COME BACK  */}
        {/* SHOW SUCCESS WITH BASIC ALERT TOO PLEASE!! AND THEN CLEAR ALLES AND GO BACK TO THE FIRST STEP...  */}
        <div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-jost text-xl text-purple tracking-wider font-regular mb-1">
                Organisation Trainee Selection
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
                    {selectedTrainees.map((trainee) => (
                      <tr key={trainee.traineeProfileId}>
                        <td className="truncate max-w-[12rem] px-3 py-3" title="Connor Bell">
                          {trainee.displayName}
                        </td>
                        <td className="truncate max-w-[12rem] px-3 py-3" title="Connor Bell">
                          {trainee.email}
                        </td>
                      </tr>
                    ))}

                    {traineeCount === 0 && (
                      <tr>
                        <td
                          colSpan={2}
                          className="py-8 text-center text-[1.2rem] tracking-wider text-red-500 font-jost"
                        >
                          No Organisation Trainee(s) Selected
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="font-jost text-xl text-purple tracking-wider font-regular mb-1">
                Training Campaign Selection
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
                    {selectedCampaigns.map((campaign) => (
                      <tr key={campaign.campaignId}>
                        <td className="truncate max-w-[6rem] px-3 py-3" title={campaign.name}>
                          {campaign.name}
                        </td>
                        <td
                          className="truncate max-w-[6rem] px-3 py-3"
                          title={campaign.description ?? 'No Description'}
                        >
                          {campaign.description ?? '—'}
                        </td>
                        <td
                          className="truncate max-w-[6rem] px-3 py-3"
                          title={
                            campaign.type === 'PREMADE_GENERAL'
                              ? 'Premade General'
                              : 'Organisation Custom'
                          }
                        >
                          {campaign.type === 'PREMADE_GENERAL'
                            ? 'Premade General'
                            : 'Organisation Custom'}
                        </td>
                      </tr>
                    ))}

                    {campaignCount === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="py-8 text-center text-[1.2rem] tracking-wider text-red-500 font-jost"
                        >
                          No Training Campaign(s) Selected
                        </td>
                      </tr>
                    )}
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
    </>
  );
}

export default ReviewCampaignAssignmentPage;
