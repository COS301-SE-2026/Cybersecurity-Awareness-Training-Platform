import { useEffect, useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { TrainingList } from '../components/training/TrainingList';
import { TrainingStatePanel } from '../components/training/TrainingStatePanel';
import * as trainingApi from '../lib/trainingApi';
import type { TrainingDocumentSummary } from '../lib/trainingApi';

export default function TrainingModulesPage() {
  const [trainingDocuments, setTrainingDocuments] = useState<TrainingDocumentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadAssignedTraining() {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const response = await trainingApi.getAssignedTraining();
      setTrainingDocuments(response.trainingDocuments);
    } catch {
      setErrorMessage('We could not load your assigned training modules. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAssignedTraining();
  }, []);

  const totalCount = trainingDocuments.length;
  const completedCount = trainingDocuments.filter(
    (trainingDocument) => trainingDocument.status === 'COMPLETED',
  ).length;
  const inProgressCount = trainingDocuments.filter(
    (trainingDocument) =>
      trainingDocument.status === 'STARTED' || trainingDocument.status === 'VIEWED',
  ).length;

  return (
    <AppLayout>
      <div
        style={{
          height: '100%',
          overflowY: 'auto',
          padding: '1.4rem 2rem 2.5rem',
        }}
      >
        <header style={{ marginBottom: '1.8rem' }}>
          <p
            style={{
              margin: 0,
              color: '#FFB7EF',
              fontFamily: 'Jost',
              fontSize: '0.95rem',
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
            }}
          >
            UC-02 Training
          </p>

          <h1
            style={{
              margin: '0.3rem 0 0',
              color: '#FFFFFF',
              fontFamily: 'Jost',
              fontSize: '3.8rem',
              fontWeight: 500,
            }}
          >
            Training Modules
          </h1>

          <p
            style={{
              margin: '0.8rem 0 0',
              color: '#D8C7FF',
              fontFamily: 'Overpass',
              fontSize: '1.08rem',
              lineHeight: 1.7,
              maxWidth: '48rem',
            }}
          >
            View and complete your assigned cybersecurity awareness training material.
          </p>
        </header>

        {isLoading ? (
          <TrainingStatePanel
            title="Loading training modules"
            message="Your assigned training content is being loaded."
          />
        ) : null}

        {!isLoading && errorMessage ? (
          <TrainingStatePanel
            title="Unable to load training"
            message={errorMessage}
            action={
              <button
                type="button"
                onClick={() => void loadAssignedTraining()}
                style={{
                  padding: '0.85rem 1.2rem',
                  backgroundColor: '#8400FF',
                  color: '#FFFFFF',
                  border: '1px solid #FF00D4',
                  cursor: 'pointer',
                  fontFamily: 'Jost',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                Try Again
              </button>
            }
          />
        ) : null}

        {!isLoading && !errorMessage && trainingDocuments.length === 0 ? (
          <TrainingStatePanel
            title="No assigned training"
            message="You do not have any training modules assigned right now."
          />
        ) : null}

        {!isLoading && !errorMessage && trainingDocuments.length > 0 ? (
          <>
            <section
              aria-label="Training progress summary"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem',
                maxWidth: '56rem',
              }}
            >
              <div
                style={{
                  border: '1px solid rgba(255, 0, 212, 0.55)',
                  backgroundColor: 'rgba(255, 0, 212, 0.1)',
                  padding: '1rem',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: '#FFB7EF',
                    fontFamily: 'Jost',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  Assigned
                </p>
                <p
                  style={{
                    margin: '0.3rem 0 0',
                    color: '#FFFFFF',
                    fontFamily: 'Jost',
                    fontSize: '2rem',
                  }}
                >
                  {totalCount}
                </p>
              </div>

              <div
                style={{
                  border: '1px solid rgba(0, 187, 255, 0.55)',
                  backgroundColor: 'rgba(0, 187, 255, 0.1)',
                  padding: '1rem',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: '#AEEAFF',
                    fontFamily: 'Jost',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  In Progress
                </p>
                <p
                  style={{
                    margin: '0.3rem 0 0',
                    color: '#FFFFFF',
                    fontFamily: 'Jost',
                    fontSize: '2rem',
                  }}
                >
                  {inProgressCount}
                </p>
              </div>

              <div
                style={{
                  border: '1px solid rgba(0, 255, 166, 0.55)',
                  backgroundColor: 'rgba(0, 255, 166, 0.1)',
                  padding: '1rem',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: '#B7FFD9',
                    fontFamily: 'Jost',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  Completed
                </p>
                <p
                  style={{
                    margin: '0.3rem 0 0',
                    color: '#FFFFFF',
                    fontFamily: 'Jost',
                    fontSize: '2rem',
                  }}
                >
                  {completedCount}
                </p>
              </div>
            </section>

            <TrainingList trainingDocuments={trainingDocuments} />
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}
