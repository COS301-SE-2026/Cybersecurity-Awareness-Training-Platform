import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { TrainingDocumentReader } from '../components/training/TrainingDocumentReader';
import { TrainingStatePanel } from '../components/training/TrainingStatePanel';
import * as trainingApi from '../lib/trainingApi';
import type { TrainingDocumentDetail } from '../lib/trainingApi';

export default function TrainingDocumentPage() {
  const { trainingId } = useParams<{ trainingId: string }>();

  const [trainingDocument, setTrainingDocument] = useState<TrainingDocumentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);

  const hasTrackedOpen = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function loadTrainingDocument() {
      if (!trainingId) {
        setErrorMessage('Training ID is missing.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage(null);

        const response = await trainingApi.getTrainingById(trainingId);

        if (!isMounted) {
          return;
        }

        setTrainingDocument(response);

        if (!hasTrackedOpen.current) {
          hasTrackedOpen.current = true;

          trainingApi.postTrainingProgress(trainingId, { status: 'VIEWED' }).catch(() => {
            // Opening progress should not block reading.
          });
        }
      } catch {
        if (isMounted) {
          setErrorMessage('We could not load this training document.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadTrainingDocument();

    return () => {
      isMounted = false;
    };
  }, [trainingId]);

  async function handleMarkAsRead() {
    if (!trainingId) {
      return;
    }

    try {
      setIsSavingProgress(true);
      setProgressError(null);

      await trainingApi.postTrainingProgress(trainingId, {
        status: 'COMPLETED',
      });
    } catch {
      setProgressError('Could not save your progress. Please try again.');
    } finally {
      setIsSavingProgress(false);
    }
  }

  return (
    <AppLayout showSidebar={false}>
      <div
        style={{
          height: '100%',
          overflowY: 'auto',
          padding: '1rem 3rem 3rem',
        }}
      >
        {isLoading ? (
          <TrainingStatePanel
            title="Loading training document"
            message="The selected training material is being loaded."
          />
        ) : null}

        {!isLoading && errorMessage ? (
          <TrainingStatePanel
            title="Unable to load training"
            message={errorMessage}
            action={
              <Link
                to={trainingApi.trainingRoutes.modules}
                style={{
                  display: 'inline-flex',
                  padding: '0.85rem 1.2rem',
                  backgroundColor: '#8400FF',
                  color: '#FFFFFF',
                  border: '1px solid #FF00D4',
                  textDecoration: 'none',
                  fontFamily: 'Jost',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                Back to Training Modules
              </Link>
            }
          />
        ) : null}

        {!isLoading && !errorMessage && !trainingDocument ? (
          <TrainingStatePanel
            title="Training not found"
            message="The requested training document could not be found."
            action={
              <Link
                to={trainingApi.trainingRoutes.modules}
                style={{
                  display: 'inline-flex',
                  padding: '0.85rem 1.2rem',
                  backgroundColor: '#8400FF',
                  color: '#FFFFFF',
                  border: '1px solid #FF00D4',
                  textDecoration: 'none',
                  fontFamily: 'Jost',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                Back to Training Modules
              </Link>
            }
          />
        ) : null}

        {!isLoading && !errorMessage && trainingDocument ? (
          <TrainingDocumentReader
            trainingDocument={trainingDocument}
            onMarkAsRead={handleMarkAsRead}
            isSavingProgress={isSavingProgress}
            progressError={progressError}
          />
        ) : null}
      </div>
    </AppLayout>
  );
}
