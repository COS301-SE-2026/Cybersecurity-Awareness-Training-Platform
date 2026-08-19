import AppLayout from '../components/layout/AppLayout';
import { useEffect, useState, type SetStateAction } from 'react';
import OrganisationTraineeSelectionPage from './campaign-assignment/OrganisationTraineeSelectionPage';
import CampaignSelectionPage from './campaign-assignment/CampaignSelectionPage';
import ReviewCampaignAssignmentPage from './campaign-assignment/ReviewCampaignAssignmentPage';
import { useNavigate } from 'react-router-dom';
import BasicConfirmationModal from '../components/layout/modals/BasicConfirmationModal';
import BasicAlert from '../components/alerts/BasicAlert';

import type {
  CampaignAssignmentCandidateOptionDto,
  AssignableCampaignOptionDto,
} from '@insightful-phish/shared';

function CampaignAssignmentPage() {
  const [currentTab, setCurrentTab] = useState<1 | 2 | 3>(1);
  const [selectedTraineeIds, setSelectedTraineeIds] = useState<string[]>([]);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);

  const hasSelectedTrainees = selectedTraineeIds.length > 0;
  const hasSelectedCampaigns = selectedCampaignIds.length > 0;
  const hasUnsubmittedSelection = hasSelectedTrainees || hasSelectedCampaigns;

  const [selectedTrainees, setSelectedTrainees] = useState<CampaignAssignmentCandidateOptionDto[]>(
    [],
  );
  const [selectedCampaigns, setSelectedCampaigns] = useState<AssignableCampaignOptionDto[]>([]);

  const navigate = useNavigate();
  const [success, setSuccess] = useState<string | null>(null);

  const handleAssignmentSuccess = () => {
    setSelectedTraineeIds([]);
    setSelectedCampaignIds([]);
    setSelectedTrainees([]);
    setSelectedCampaigns([]);
    setCurrentTab(1);
    setSuccess('Campaign Assignment(s) Completed Successfully');
  };

  const handleTraineeSelectionChange = (ids: SetStateAction<string[]>) => {
    setSelectedTraineeIds(ids);

    if (typeof ids === 'function') {
      return;
    }

    if (ids.length === 0) {
      setCurrentTab(1);
    }
  };

  const handleCampaignSelectionChange = (ids: SetStateAction<string[]>) => {
    setSelectedCampaignIds(ids);

    if (typeof ids === 'function') {
      return;
    }

    if (ids.length === 0 && currentTab === 3) {
      setCurrentTab(2);
    }
  };

  useEffect(() => {
    if (hasUnsubmittedSelection === false) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsubmittedSelection]);

  return (
    <>
      {success && (
        <BasicAlert variant="success" onClose={() => setSuccess(null)}>
          {success}
        </BasicAlert>
      )}

      <AppLayout
        contentStyle={{
          backgroundColor: '#F3F4F6',
        }}
      >
        <div>
          {/* HEADING  and SUB-HEADING */}
          <div
            style={{
              padding: '1.4rem',
              boxSizing: 'border-box',
              flexShrink: 0,
              paddingBottom: '0.4rem',
            }}
          >
            {/* Back to Organisation Trainees Page Button */}
            <button
              type="button"
              onClick={() => {
                if (hasUnsubmittedSelection === true) {
                  setShowLeaveConfirmation(true);
                } else {
                  navigate('/organisation-trainees');
                }
              }}
              className="-mt-4 inline-flex items-center gap-2 font-jost text-xl font-regular tracking-wide text-purple hover:text-purple cursor-pointer transition-colours"
            >
              <span className="material-icons-sharp">arrow_back</span>
              <span className="hover:underline"> Back to Organisation Trainees</span>
            </button>

            {showLeaveConfirmation && (
              <BasicConfirmationModal
                title="Leave Campaign Assignment"
                message="Your unsubmitted organisation trainee and training campaign selections will be lost. Are you sure that you want to leave?"
                confirmButtonText="Leave"
                confirmButtonVariant="danger"
                onConfirm={() => {
                  setShowLeaveConfirmation(false);

                  navigate('/organisation-trainees');
                }}
                onCancel={() => setShowLeaveConfirmation(false)}
              />
            )}

            <h1
              style={{
                margin: 0,
                marginBottom: '0.4rem',
                fontWeight: 500,
                fontSize: '2.8rem',
                lineHeight: 1,
                fontFamily: 'Jost',
                color: 'rgb(132, 25, 255)',
              }}
            >
              Assign Training Campaigns
            </h1>

            <p className="font-regular tracking-wider text-[1.1rem] font-justify font-jost text-gray-500 mb-2">
              Select the organisation trainees you want to assign training campaigns to, then choose
              the campaigns and review your assignments before submitting. Assigning new campaigns
              will not affect campaigns already assigned to organisation trainees or reset their
              progress.
            </p>
          </div>

          <div className="flex flex-col flex-1 p-5 -mt-5 w-full">
            {/* TAB BUTTONS */}
            <ul className="hidden text-sm font-medium text-center text-body sm:flex -space-x-px">
              <li className="w-full focus-within:z-10">
                <button
                  type="button"
                  aria-current={currentTab === 1 ? 'step' : undefined}
                  onClick={() => setCurrentTab(1)}
                  className={`disabled:opacity-50 disabled:hover:text-body disabled:hover:bg-white disabled:cursor-not-allowed font-jost inline-block w-full bg-neutral-primary-soft border border-default hover:bg-neutral-secondary-medium hover:text-[var(--ip-purple)] focus:ring-4 focus:ring-neutral-secondary-strong font-light text-[1.2rem] tracking-wide leading-5 px-5 py-3 focus:outline-none ${
                    currentTab === 1
                      ? 'bg-faint-purple text-[var(--ip-purple)] font-medium'
                      : 'bg-neutral-primary-soft text-body hover:bg-neutral-secondary-medium hover:text-[var(--ip-purple)]'
                  }`}
                >
                  1. Organisation Trainee Selection
                </button>
              </li>
              <li className="w-full focus-within:z-10">
                <button
                  type="button"
                  aria-current={currentTab === 2 ? 'step' : undefined}
                  disabled={!hasSelectedTrainees}
                  onClick={() => setCurrentTab(2)}
                  className={`disabled:opacity-50 disabled:hover:text-body disabled:hover:bg-white disabled:cursor-not-allowed font-jost inline-block w-full bg-neutral-primary-soft border border-default hover:bg-neutral-secondary-medium hover:text-[var(--ip-purple)] focus:ring-4 focus:ring-neutral-secondary-strong font-light text-[1.2rem] tracking-wide leading-5 px-5 py-3 focus:outline-none ${
                    currentTab === 2
                      ? 'bg-faint-purple text-[var(--ip-purple)] font-medium'
                      : 'bg-neutral-primary-soft text-body hover:bg-neutral-secondary-medium hover:text-[var(--ip-purple)]'
                  }`}
                >
                  2. Training Campaign Selection
                </button>
              </li>
              <li className="w-full focus-within:z-10">
                <button
                  type="button"
                  aria-current={currentTab === 3 ? 'step' : undefined}
                  disabled={!hasSelectedTrainees || !hasSelectedCampaigns}
                  onClick={() => setCurrentTab(3)}
                  className={`disabled:opacity-50 disabled:hover:text-body disabled:hover:bg-white disabled:cursor-not-allowed font-jost inline-block w-full bg-neutral-primary-soft border border-default hover:bg-neutral-secondary-medium hover:text-[var(--ip-purple)] focus:ring-4 focus:ring-neutral-secondary-strong font-light text-[1.2rem] tracking-wide leading-5 px-5 py-3 focus:outline-none ${
                    currentTab === 3
                      ? 'bg-faint-purple text-[var(--ip-purple)] font-medium'
                      : 'bg-neutral-primary-soft text-body hover:bg-neutral-secondary-medium hover:text-[var(--ip-purple)]'
                  }`}
                >
                  3. Review Assignment
                </button>
              </li>
            </ul>

            {/* CONTENT BOX */}
            <div className="w-full p-8 bg-white md:mt-0 bg-neutral-primary-soft border-default border-x border-b">
              {currentTab === 1 && (
                <OrganisationTraineeSelectionPage
                  selectedTraineeIds={selectedTraineeIds}
                  setSelectedTraineesIds={handleTraineeSelectionChange}
                  setSelectedTrainees={setSelectedTrainees}
                  onContinue={() => setCurrentTab(2)}
                />
              )}

              {currentTab === 2 && (
                <CampaignSelectionPage
                  selectedCampaignIds={selectedCampaignIds}
                  setSelectedCampaignIds={handleCampaignSelectionChange}
                  setSelectedCampaigns={setSelectedCampaigns}
                  onBack={() => setCurrentTab(1)}
                  onContinue={() => setCurrentTab(3)}
                />
              )}

              {currentTab === 3 && (
                <ReviewCampaignAssignmentPage
                  selectedTraineeIds={selectedTraineeIds}
                  selectedCampaignIds={selectedCampaignIds}
                  selectedCampaigns={selectedCampaigns}
                  selectedTrainees={selectedTrainees}
                  onBack={() => setCurrentTab(2)}
                  onAssignmentSuccess={handleAssignmentSuccess}
                />
              )}
            </div>
          </div>
        </div>
      </AppLayout>
    </>
  );
}

export default CampaignAssignmentPage;
