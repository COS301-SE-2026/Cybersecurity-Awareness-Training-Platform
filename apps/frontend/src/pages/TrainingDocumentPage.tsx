import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type {
  GetTrainingDocumentResponseDto,
  TraineeCampaignItemSummaryDto,
} from '@insightful-phish/shared';
import AppLayout from '../components/layout/AppLayout';
import TrainingDocumentReader from '../components/training/TrainingDocumentReader';
import { getTraineeCampaignDetail, getTraineeCampaigns } from '../lib/campaignsApi';
import { resolveDemoTrainingContent } from '../lib/demoTrainingContent';
import {
  getCampaignItemTrainingDocument,
  recordTrainingDocumentCompleted,
  recordTrainingDocumentViewed,
} from '../lib/trainingApi';
import './TrainingDocumentPage.css';
import BasicAlert from '../components/alerts/BasicAlert';

function findCampaignItemProgressStatus(
  items: ReadonlyArray<TraineeCampaignItemSummaryDto>,
  campaignItemId: string,
): string | null {
  for (const item of items) {
    if (item.campaignItemId === campaignItemId) {
      return item.progressStatus ?? null;
    }

    if (item.itemType === 'GROUP' && item.children) {
      const childProgressStatus = findCampaignItemProgressStatus(item.children, campaignItemId);

      if (childProgressStatus) {
        return childProgressStatus;
      }
    }
  }

  return null;
}

function resolveTrainingDocumentContent(documentResponse: GetTrainingDocumentResponseDto | null) {
  const trainingDocument = documentResponse?.trainingDocument;
  const backendContent = trainingDocument?.content;
  const renderedHtml = trainingDocument?.renderedHtml;
  if (trainingDocument?.contentType === 'MARKDOWN' && renderedHtml?.trim()) {
    return { body: renderedHtml, format: 'html' } as const;
  }

  if (trainingDocument && backendContent && backendContent.trim()) {
    return {
      body: backendContent,
      format: trainingDocument.contentType === 'MARKDOWN' ? 'markdown' : 'text',
    } as const;
  }

  return resolveDemoTrainingContent(trainingDocument?.contentRef);
}

export default function TrainingDocumentPage() {
  const { campaignItemId } = useParams<{ campaignItemId: string }>();
  const missingCampaignItemId = !campaignItemId;

  const [documentResponse, setDocumentResponse] = useState<GetTrainingDocumentResponseDto | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isPreviouslyCompleted, setIsPreviouslyCompleted] = useState(false);
  const [didCompleteInSession, setDidCompleteInSession] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completionError, setCompletionError] = useState<string | null>(null);

  const viewedRecordedRef = useRef(false);

  useEffect(() => {
    const currentCampaignItemId = campaignItemId;

    if (!currentCampaignItemId) {
      return;
    }

    let isMounted = true;

    async function loadTrainingDocument(campaignItemIdToLoad: string) {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        setIsPreviouslyCompleted(false);
        setDidCompleteInSession(false);
        setCompletionError(null);

        const response = await getCampaignItemTrainingDocument(campaignItemIdToLoad);

        if (isMounted) {
          setDocumentResponse(response);
        }
      } catch {
        if (isMounted) {
          setErrorMessage('Could not load this training document.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    viewedRecordedRef.current = false;
    void loadTrainingDocument(currentCampaignItemId);

    return () => {
      isMounted = false;
    };
  }, [campaignItemId]);

  useEffect(() => {
    const currentCampaignItemId = campaignItemId;
    const currentCampaignAssignmentId = documentResponse?.campaignAssignmentId;

    if (!currentCampaignItemId || !currentCampaignAssignmentId) {
      return;
    }

    let isMounted = true;

    async function loadPersistedCompletionStatus(
      campaignItemIdToLoad: string,
      campaignAssignmentIdToLoad: string,
    ) {
      try {
        const campaignsResponse = await getTraineeCampaigns();
        const matchingCampaign = campaignsResponse.campaigns.find(
          (campaign) => campaign.assignment?.assignmentId === campaignAssignmentIdToLoad,
        );

        if (!matchingCampaign) {
          return;
        }

        const campaignDetail = await getTraineeCampaignDetail(matchingCampaign.campaignId);
        const progressStatus = findCampaignItemProgressStatus(
          campaignDetail.items,
          campaignItemIdToLoad,
        );

        if (isMounted) {
          setIsPreviouslyCompleted(progressStatus === 'COMPLETED');
        }
      } catch {
        // Training access should still work even if campaign progress refresh fails.
      }
    }

    void loadPersistedCompletionStatus(currentCampaignItemId, currentCampaignAssignmentId);

    return () => {
      isMounted = false;
    };
  }, [campaignItemId, documentResponse]);

  useEffect(() => {
    if (!campaignItemId || !documentResponse || viewedRecordedRef.current) {
      return;
    }

    viewedRecordedRef.current = true;

    void recordTrainingDocumentViewed(campaignItemId).catch(() => {
      // Tracking should not block reading the document content.
    });
  }, [campaignItemId, documentResponse]);

  const resolvedContent = useMemo(
    () => resolveTrainingDocumentContent(documentResponse),
    [documentResponse],
  );
  const pageErrorMessage = missingCampaignItemId ? 'Campaign item ID is missing.' : errorMessage;
  const isCompleted = isPreviouslyCompleted || didCompleteInSession;

  async function handleComplete() {
    if (!campaignItemId) {
      return;
    }

    try {
      setIsCompleting(true);
      setCompletionError(null);

      await recordTrainingDocumentCompleted(campaignItemId);
      setDidCompleteInSession(true);
      setIsPreviouslyCompleted(true);
    } catch {
      setCompletionError('Could not record completion. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  }

  return (
    <AppLayout
      className="training-document-layout"
      showSidebar={false}
      contentStyle={{ backgroundColor: 'white' }}
    >
      <div
        className="training-document-page"
        style={{
          padding: '1.25rem',
          display: 'grid',
          gap: '1rem',
          width: 'min(1180px, 100%)',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        <Link
          className="training-document-page__back"
          to="/campaigns"
          style={{
            color: 'var(--ip-deep-purple)',
            fontFamily: 'Jost',
            textDecoration: 'none',
            width: 'fit-content',
            fontWeight: 500,
            letterSpacing: '0.08em',
          }}
        >
          ← Back to campaigns
        </Link>

        {!missingCampaignItemId && isLoading ? (
          <p style={pageMessageStyle}>Loading training document...</p>
        ) : pageErrorMessage || !documentResponse ? (
          <div role="alert" style={pageAlertStyle}>
            <p style={{ margin: 0 }}>{pageErrorMessage ?? 'Training document was not found.'}</p>
          </div>
        ) : (
          <>
            <header
              style={{
                display: 'grid',
                gap: '0.6rem',
              }}
            >
              <p style={eyebrowStyle}>Training document</p>

              <h1
                className="training-document-page__title"
                style={{
                  margin: 0,
                  color: 'var(--ip-dark-pink)',
                  fontFamily: 'Jost',
                  fontSize: '2.5rem',
                  fontWeight: 500,
                  lineHeight: 1.1,
                }}
              >
                {documentResponse.trainingDocument.title}
              </h1>

              {(documentResponse.trainingDocument.contentSummary ??
              documentResponse.campaignItem.description) ? (
                <p
                  style={{
                    margin: 0,
                    color: '#4B5563',
                    fontFamily: 'Overpass',
                    lineHeight: 1.7,
                    maxWidth: '52rem',
                  }}
                >
                  {documentResponse.trainingDocument.contentSummary ??
                    documentResponse.campaignItem.description}
                </p>
              ) : null}
            </header>

            <TrainingDocumentReader
              resolvedContent={resolvedContent.body}
              resolvedFormat={resolvedContent.format}
            />

            {completionError ? (
              <BasicAlert variant="danger" onClose={() => setCompletionError(null)}>
                {completionError}
              </BasicAlert>
            ) : null}

            {didCompleteInSession ? (
              <BasicAlert variant="success" onClose={() => setDidCompleteInSession(false)}>
                Training completion recorded.
              </BasicAlert>
            ) : null}

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <button
                className="training-document-page__complete cursor-pointer whitespace-nowrap px-6 inline-flex gap-2 items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm py-2.5 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
                onClick={() => {
                  void handleComplete();
                }}
                disabled={isCompleting || isCompleted}
              >
                <span
                  className={`material-symbols-sharp ${isCompleting ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                >
                  {isCompleted ? 'check_circle' : isCompleting ? 'progress_activity' : 'task_alt'}
                </span>
                <span>
                  {isCompleted ? 'Completed' : isCompleting ? 'Recording...' : 'Mark as completed'}
                </span>
              </button>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

const eyebrowStyle = {
  margin: 0,
  color: 'var(--ip-dark-pink)',
  fontFamily: 'Jost',
  fontSize: '0.9rem',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
} as const;

const pageMessageStyle = {
  margin: 0,
  color: '#4B5563',
  fontFamily: 'Overpass',
} as const;

const pageAlertStyle = {
  border: '1px solid rgba(255, 107, 138, 0.7)',
  backgroundColor: 'rgba(255, 107, 138, 0.12)',
  color: '#991B1B',
  padding: '1rem 1.2rem',
  fontFamily: 'Overpass',
} as const;

// const primaryButtonStyle = {
//   padding: '0.9rem 1.2rem',
//   border: '1px solid #FF00D4',
//   backgroundColor: '#8400FF',
//   color: '#FFFFFF',
//   fontFamily: 'Jost',
//   fontWeight: 700,
//   cursor: 'pointer',
// } as const;

// const secondaryLinkStyle = {
//   display: 'inline-flex',
//   alignItems: 'center',
//   padding: '0.9rem 1.2rem',
//   border: '1px solid var(--ip-bg-purple)',
//   backgroundColor: '#FFFFFF',
//   color: 'var(--ip-deep-purple)',
//   fontFamily: 'Jost',
//   fontWeight: 700,
//   textDecoration: 'none',
// } as const;
