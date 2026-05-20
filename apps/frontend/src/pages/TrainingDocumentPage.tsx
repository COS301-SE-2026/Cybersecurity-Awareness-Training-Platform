import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { GetTrainingDocumentResponseDto } from '@insightful-phish/shared';
import AppLayout from '../components/layout/AppLayout';
import TrainingDocumentReader from '../components/training/TrainingDocumentReader';
import { resolveDemoTrainingContent } from '../lib/demoTrainingContent';
import {
  getCampaignItemTrainingDocument,
  recordTrainingDocumentCompleted,
  recordTrainingDocumentViewed,
} from '../lib/trainingApi';

export default function TrainingDocumentPage() {
  const { campaignItemId } = useParams<{ campaignItemId: string }>();
  const missingCampaignItemId = !campaignItemId;

  const [documentResponse, setDocumentResponse] = useState<GetTrainingDocumentResponseDto | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
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
        setCompleted(false);
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
    if (!campaignItemId || !documentResponse || viewedRecordedRef.current) {
      return;
    }

    viewedRecordedRef.current = true;

    void recordTrainingDocumentViewed(campaignItemId).catch(() => {
      // Tracking should not block reading the document content.
    });
  }, [campaignItemId, documentResponse]);

  const resolvedContent = useMemo(
    () => resolveDemoTrainingContent(documentResponse?.trainingDocument.contentRef),
    [documentResponse],
  );
  const pageErrorMessage = missingCampaignItemId ? 'Campaign item ID is missing.' : errorMessage;

  async function handleComplete() {
    if (!campaignItemId) {
      return;
    }

    try {
      setIsCompleting(true);
      setCompletionError(null);

      await recordTrainingDocumentCompleted(campaignItemId);
      setCompleted(true);
    } catch {
      setCompletionError('Could not record completion. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  }

  return (
    <AppLayout showSidebar={false}>
      <div
        style={{
          padding: '1.5rem 2rem 2.5rem',
          display: 'grid',
          gap: '1.25rem',
        }}
      >
        <Link
          to="/campaigns"
          style={{
            color: '#D8CCE8',
            fontFamily: 'Jost',
            textDecoration: 'none',
            width: 'fit-content',
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
                style={{
                  margin: 0,
                  color: '#FFFFFF',
                  fontFamily: 'Jost',
                  fontSize: '2.8rem',
                  fontWeight: 500,
                  lineHeight: 1.05,
                }}
              >
                {documentResponse.trainingDocument.title}
              </h1>

              {(documentResponse.trainingDocument.contentSummary ??
              documentResponse.campaignItem.description) ? (
                <p
                  style={{
                    margin: 0,
                    color: '#D8CCE8',
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
              title={documentResponse.trainingDocument.title}
              contentType={documentResponse.trainingDocument.contentType}
              contentRef={documentResponse.trainingDocument.contentRef}
              resolvedContent={resolvedContent.body}
              resolvedFormat={resolvedContent.format}
            />

            {completionError ? (
              <div role="alert" style={pageAlertStyle}>
                <p style={{ margin: 0 }}>{completionError}</p>
              </div>
            ) : null}

            {completed ? (
              <div style={successStyle}>
                <p style={{ margin: 0 }}>Training completion recorded.</p>
              </div>
            ) : null}

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  void handleComplete();
                }}
                disabled={isCompleting || completed}
                style={primaryButtonStyle}
              >
                {completed ? 'Completed' : isCompleting ? 'Recording...' : 'Mark as completed'}
              </button>

              <Link to="/campaigns" style={secondaryLinkStyle}>
                Continue
              </Link>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

const eyebrowStyle = {
  margin: 0,
  color: '#FF00D4',
  fontFamily: 'Jost',
  fontSize: '0.9rem',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
} as const;

const pageMessageStyle = {
  margin: 0,
  color: '#D8CCE8',
  fontFamily: 'Overpass',
} as const;

const pageAlertStyle = {
  border: '1px solid rgba(255, 107, 138, 0.7)',
  backgroundColor: 'rgba(255, 107, 138, 0.12)',
  color: '#FFB7C8',
  padding: '1rem 1.2rem',
  fontFamily: 'Overpass',
} as const;

const successStyle = {
  border: '1px solid rgba(0, 255, 166, 0.55)',
  backgroundColor: 'rgba(0, 255, 166, 0.12)',
  color: '#B7FFD9',
  padding: '1rem 1.2rem',
  fontFamily: 'Overpass',
} as const;

const primaryButtonStyle = {
  padding: '0.9rem 1.2rem',
  border: '1px solid #FF00D4',
  backgroundColor: '#8400FF',
  color: '#FFFFFF',
  fontFamily: 'Jost',
  fontWeight: 700,
  cursor: 'pointer',
} as const;

const secondaryLinkStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.9rem 1.2rem',
  border: '1px solid rgba(255, 255, 255, 0.16)',
  color: '#D8CCE8',
  fontFamily: 'Jost',
  fontWeight: 700,
  textDecoration: 'none',
} as const;
