import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { TrainingAsyncContent } from '../components/training/TrainingAsyncContent';
import { TrainingDocumentReader } from '../components/training/TrainingDocumentReader';
import { trainingStateActionStyle } from '../components/training/trainingStateStyles';
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

  const backToModulesAction = (
    <Link to={trainingApi.trainingRoutes.modules} style={trainingStateActionStyle}>
      Back to Training Modules
    </Link>
  );

  return (
    <AppLayout showSidebar={false}>
      <div
        style={{
          height: '100%',
          overflowY: 'auto',
          padding: '1rem 3rem 3rem',
        }}
      >
        <TrainingAsyncContent
          isLoading={isLoading}
          loadingTitle="Loading training document"
          loadingMessage="The selected training material is being loaded."
          errorMessage={errorMessage}
          errorTitle="Unable to load training"
          errorAction={backToModulesAction}
          isEmpty={!trainingDocument}
          emptyTitle="Training not found"
          emptyMessage="The requested training document could not be found."
          emptyAction={backToModulesAction}
        >
          {trainingDocument ? (
            <TrainingDocumentReader
              trainingDocument={trainingDocument}
              onMarkAsRead={handleMarkAsRead}
              isSavingProgress={isSavingProgress}
              progressError={progressError}
            />
          ) : null}
        </TrainingAsyncContent>
      </div>
    </AppLayout>
  );
}
