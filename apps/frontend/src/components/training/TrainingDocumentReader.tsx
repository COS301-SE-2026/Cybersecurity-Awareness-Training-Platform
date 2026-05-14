import { Link } from 'react-router-dom';
import type { TrainingDocumentDetail } from '../../lib/trainingApi';
import { trainingRoutes } from '../../lib/trainingApi';
import { TrainingMarkdownContent } from './TrainingMarkdownContent';
import { TrainingQuizCallToAction } from './TrainingQuizCallToAction';
import { TrainingStatePanel } from './TrainingStatePanel';

interface TrainingDocumentReaderProps {
  trainingDocument: TrainingDocumentDetail;
  onMarkAsRead: () => void;
  isSavingProgress: boolean;
  progressError: string | null;
}

export function TrainingDocumentReader({
  trainingDocument,
  onMarkAsRead,
  isSavingProgress,
  progressError,
}: TrainingDocumentReaderProps) {
  if (!trainingDocument.contentMarkdown.trim()) {
    return (
      <TrainingStatePanel
        title="Training content unavailable"
        message="This training document is assigned, but the readable content is not available yet."
        action={
          <Link
            to={trainingRoutes.modules}
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
    );
  }

  return (
    <article style={{ maxWidth: '64rem' }}>
      <Link
        to={trainingRoutes.modules}
        style={{
          color: '#FFB7EF',
          fontFamily: 'Jost',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        Back to Training Modules
      </Link>

      <header style={{ marginTop: '1.4rem', marginBottom: '1.4rem' }}>
        <h1
          style={{
            margin: 0,
            color: '#FFFFFF',
            fontFamily: 'Jost',
            fontSize: '3.8rem',
            fontWeight: 500,
            lineHeight: 1.05,
          }}
        >
          {trainingDocument.title}
        </h1>

        <p
          style={{
            margin: '1rem 0 0',
            color: '#D8C7FF',
            fontFamily: 'Overpass',
            fontSize: '1.05rem',
            lineHeight: 1.7,
            maxWidth: '46rem',
          }}
        >
          Read the training material below, then mark it as read when you are done.
        </p>
      </header>

      <section
        style={{
          border: '1px solid rgba(132, 0, 255, 0.7)',
          backgroundColor: 'rgba(14, 0, 32, 0.82)',
          boxShadow: '0 0 24px rgba(132, 0, 255, 0.18)',
          padding: '2rem',
        }}
      >
        <TrainingMarkdownContent content={trainingDocument.contentMarkdown} />
      </section>

      <section
        style={{
          marginTop: '1.5rem',
          border: '1px solid rgba(0, 255, 166, 0.75)',
          backgroundColor: 'rgba(0, 255, 166, 0.08)',
          padding: '1.4rem',
        }}
      >
        <h2
          style={{
            margin: 0,
            color: '#B7FFD9',
            fontFamily: 'Jost',
            fontSize: '1.6rem',
            fontWeight: 500,
          }}
        >
          Finished reading?
        </h2>

        <p
          style={{
            margin: '0.6rem 0 0',
            color: '#D9FFEC',
            fontFamily: 'Overpass',
            lineHeight: 1.6,
          }}
        >
          Mark this module as read so your progress can be updated.
        </p>

        <button
          type="button"
          onClick={onMarkAsRead}
          disabled={isSavingProgress}
          style={{
            marginTop: '1.1rem',
            padding: '0.85rem 1.2rem',
            backgroundColor: isSavingProgress ? '#31594B' : '#007A50',
            color: '#FFFFFF',
            border: '1px solid #00FFA6',
            cursor: isSavingProgress ? 'not-allowed' : 'pointer',
            fontFamily: 'Jost',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            opacity: isSavingProgress ? 0.7 : 1,
          }}
        >
          {isSavingProgress ? 'Saving Progress...' : 'Mark as Read'}
        </button>

        {progressError ? (
          <p
            style={{
              margin: '0.9rem 0 0',
              color: '#FFB7EF',
              fontFamily: 'Overpass',
              fontWeight: 700,
            }}
          >
            {progressError}
          </p>
        ) : null}
      </section>

      {trainingDocument.linkedQuizId ? (
        <TrainingQuizCallToAction linkedQuizId={trainingDocument.linkedQuizId} />
      ) : null}
    </article>
  );
}
