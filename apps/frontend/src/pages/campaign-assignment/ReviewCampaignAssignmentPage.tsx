import type {
  AssignableCampaignOptionDto,
  CampaignAssignmentCandidateOptionDto,
  CreateCampaignAssignmentsResponseDto,
} from '@insightful-phish/shared';
import { useState } from 'react';
import { useAuth } from '../../context/useAuth';
import { createCampaignAssignments } from '../../services/campaign-assignment.service';
import LoadingSpinnerSVG from '../../components/LoadingSpinnerSVG';
import BasicAlert from '../../components/alerts/BasicAlert';
import BasicConfirmationModal from '../../components/layout/modals/BasicConfirmationModal';
import { ApiError } from '../../lib/apiClient';

type SubmissionError = Readonly<{
  message: string;
  variant: 'danger' | 'warning';
}>;

function getStaleEligibilityTarget(error: ApiError): 'campaign' | 'trainee' | null {
  const body =
    error.body !== null && typeof error.body === 'object'
      ? (error.body as { error?: unknown })
      : null;
  const errorCode = typeof body?.error === 'string' ? body.error : null;

  if (
    (error.status === 404 || error.status === 409) &&
    (errorCode === 'CAMPAIGN_NOT_FOUND' || errorCode === 'CAMPAIGN_INACTIVE')
  ) {
    return 'campaign';
  }

  if (
    (error.status === 404 || error.status === 409) &&
    (errorCode === 'TRAINEE_NOT_FOUND' || errorCode === 'TRAINEE_DISABLED')
  ) {
    return 'trainee';
  }

  return null;
}

type ReviewCampaignAssignmentPageProps = Readonly<{
  selectedTraineeIds: string[];
  selectedCampaignIds: string[];
  selectedTrainees: CampaignAssignmentCandidateOptionDto[];
  selectedCampaigns: AssignableCampaignOptionDto[];
  onBack: () => void;
  onAssignmentSuccess: (result: CreateCampaignAssignmentsResponseDto) => void;
  onEligibilityChanged: (target: 'campaign' | 'trainee') => void;
}>;

function ReviewCampaignAssignmentPage({
  selectedTraineeIds,
  selectedCampaignIds,
  selectedTrainees,
  selectedCampaigns,
  onBack,
  onAssignmentSuccess,
  onEligibilityChanged,
}: ReviewCampaignAssignmentPageProps) {
  const traineeCount = selectedTraineeIds.length; // # Trainees
  const campaignCount = selectedCampaignIds.length; // # Campaigns
  const assignmentCount = traineeCount * campaignCount; // Total Assignments

  const { authContext, clearAuth } = useAuth();
  const organisationId = authContext?.organisation?.id ?? null;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<SubmissionError | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleCompleteAssignment = async () => {
    if (organisationId === null || traineeCount === 0 || campaignCount === 0) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createCampaignAssignments(organisationId, {
        campaignIds: selectedCampaignIds,
        traineeProfileIds: selectedTraineeIds,
      });

      onAssignmentSuccess(result);
    } catch (requestError: unknown) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        clearAuth();
        return;
      }

      if (requestError instanceof ApiError) {
        const staleTarget = getStaleEligibilityTarget(requestError);

        if (staleTarget !== null) {
          onEligibilityChanged(staleTarget);
          return;
        }
      }

      if (requestError instanceof ApiError && requestError.status === 429) {
        setError({
          message: requestError.message,
          variant: 'warning',
        });
        return;
      }

      setError({
        message: 'Unable To Complete Campaign Assignment. Please Try Again.',
        variant: 'danger',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <>
      {error !== null && (
        <BasicAlert variant={error.variant} onClose={() => setError(null)}>
          {error.message}
        </BasicAlert>
      )}

      {showConfirmation && (
        <BasicConfirmationModal
          title="Confirm Campaign Assignment"
          message={`You are about to assign ${campaignCount} training campaign(s) to ${traineeCount} organisation trainee(s), creating ${assignmentCount} total assignment(s). Are you sure you want to continue?`}
          confirmButtonText="Confirm Assignment"
          confirmButtonVariant="default"
          onConfirm={() => {
            setShowConfirmation(false);
            void handleCompleteAssignment();
          }}
          onCancel={() => setShowConfirmation(false)}
          isConfirming={isSubmitting}
          isConfirmDisabled={isSubmitting}
          isDismissDisabled={isSubmitting}
        />
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 mb-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            {/* PROGRESS HEADING */}
            <h3 className="font-overpass font-regular text-[1.2rem] text-gray-600 tracking-wider font-regular">
              Step 3 of 3
            </h3>

            {/* HEADING */}
            <h3 className="font-jost text-2xl text-dark-pink tracking-wider font-medium">
              Review Campaign Assignment
            </h3>
          </div>

          <div className="flex flex-col items-start lg:items-end">
            <p className="font-regular tracking-wide text-base font-left font-jost text-pink mb-2">
              {assignmentCount} assignments across {traineeCount} trainees and {campaignCount}{' '}
              campaigns
            </p>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              {/* Back Button (TO STEP 1) */}
              <button
                type="button"
                onClick={onBack}
                className="inline-flex w-full sm:w-40 items-center justify-center text-body bg-neutral-secondary-medium box-border border border-default-medium hover:bg-neutral-tertiary-medium hover:text-heading focus:ring-4 focus:ring-neutral-tertiary shadow-xs font-jost tracking-wider cursor-pointer font-regular leading-5 text-[1.1rem] px-4 py-2.5 focus:outline-none"
              >
                Back
              </button>

              {/* CONTINUE BUTTON (TO STEP 3) */}
              <button
                type="button"
                disabled={
                  traineeCount === 0 || campaignCount === 0 || isSubmitting || !organisationId
                }
                onClick={() => setShowConfirmation(true)}
                className="cursor-pointer w-full sm:w-60 px-6 inline-flex gap-2 items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting && <LoadingSpinnerSVG />}
                <span>{isSubmitting ? 'Assigning...' : 'Complete Assignment'}</span>
              </button>
            </div>
          </div>
        </div>
        <div>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
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
        </div>
      </div>
    </>
  );
}

export default ReviewCampaignAssignmentPage;
