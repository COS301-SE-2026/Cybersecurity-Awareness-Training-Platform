import { Link } from 'react-router-dom';
import type { TrainingDocumentDetail } from '../../lib/trainingApi';
import { trainingRoutes } from '../../lib/trainingApi';
import { TrainingStatePanel } from './TrainingStatePanel';

interface TrainingDocumentReaderProps {
  trainingDocument: TrainingDocumentDetail;
  onMarkAsRead: () => void;
  isSavingProgress: boolean;
  progressError: string | null;
}

function getMarkdownLines(content: string) {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function renderDocumentLine(line: string, index: number) {
  if (line.startsWith('# ')) {
    return (
      <h2
        key={index}
        style={{
          margin: '0 0 1.4rem',
          color: '#FFFFFF',
          fontFamily: 'Jost',
          fontSize: '3rem',
          fontWeight: 700,
          lineHeight: 1.1,
        }}
      >
        {line.replace('# ', '')}
      </h2>
    );
  }

  if (line.startsWith('## ')) {
    return (
      <h3
        key={index}
        style={{
          margin: '2rem 0 0.8rem',
          color: '#FFB7EF',
          fontFamily: 'Jost',
          fontSize: '1.65rem',
          fontWeight: 700,
        }}
      >
        {line.replace('## ', '')}
      </h3>
    );
  }

  if (line.startsWith('- ')) {
    return (
      <p
        key={index}
        style={{
          margin: '0.55rem 0 0.55rem 1.2rem',
          color: '#F4EEFF',
          fontFamily: 'Overpass',
          fontSize: '1.1rem',
          lineHeight: 1.7,
        }}
      >
        • {line.replace('- ', '')}
      </p>
    );
  }

  return (
    <p
      key={index}
      style={{
        margin: '0.85rem 0',
        color: '#F4EEFF',
        fontFamily: 'Overpass',
        fontSize: '1.1rem',
        lineHeight: 1.8,
      }}
    >
      {line}
    </p>
  );
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

  const documentLines = getMarkdownLines(trainingDocument.contentMarkdown);

  return (
    <article
      style={{
        width: 'min(94vw, 112rem)',
        margin: '0 auto',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.4rem',
          marginBottom: '1.4rem',
        }}
      >
        <Link
          to={trainingRoutes.modules}
          aria-label="Back to Training Modules"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '2.8rem',
            height: '2.8rem',
            color: '#FFFFFF',
            textDecoration: 'none',
            fontFamily: 'Jost',
            fontSize: '2.3rem',
            lineHeight: 1,
          }}
        >
          ←
        </Link>

        <div>
          <p
            style={{
              margin: '0 0 0.35rem',
              color: '#B79CFF',
              fontFamily: 'Overpass',
              fontSize: '0.82rem',
              letterSpacing: '0.08em',
            }}
          >
            Training material page
          </p>

          <h1
            style={{
              margin: 0,
              color: '#FFFFFF',
              fontFamily: 'Jost',
              fontSize: '2.5rem',
              fontWeight: 700,
              lineHeight: 1.1,
            }}
          >
            {trainingDocument.title}
          </h1>

          <p
            style={{
              margin: '0.45rem 0 0',
              color: '#D8C7FF',
              fontFamily: 'Overpass',
              fontSize: '0.95rem',
            }}
          >
            Read the training material below, then complete the module when you are done.
          </p>
        </div>
      </header>

      <section
        aria-label="Training document"
        style={{
          minHeight: 'calc(100vh - 18rem)',
          borderRadius: '1rem',
          border: '1px solid rgba(255, 0, 212, 0.55)',
          background: 'linear-gradient(135deg, rgba(31, 0, 71, 0.95), rgba(14, 0, 32, 0.98))',
          boxShadow: '0 0 36px rgba(132, 0, 255, 0.32)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.4rem',
            borderBottom: '1px solid rgba(255, 0, 212, 0.35)',
            backgroundColor: '#25004E',
          }}
        >
          <p
            style={{
              margin: 0,
              color: '#FFFFFF',
              fontFamily: 'Jost',
              fontSize: '1rem',
              fontWeight: 700,
            }}
          >
            {trainingDocument.title}
          </p>

          <p
            style={{
              margin: 0,
              color: '#B79CFF',
              fontFamily: 'Overpass',
              fontSize: '0.85rem',
            }}
          >
            Assigned training material
          </p>
        </div>

        <div
          style={{
            minHeight: 'calc(100vh - 22rem)',
            padding: '2.5rem',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'stretch',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '82rem',
              minHeight: '100%',
              padding: '3.2rem 4rem',
              border: '1px solid rgba(255, 0, 212, 0.45)',
              backgroundColor: '#0E0020',
              boxShadow: '0 0 30px rgba(255, 0, 212, 0.18)',
              overflowY: 'auto',
            }}
          >
            {documentLines.map(renderDocumentLine)}
          </div>
        </div>
      </section>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          marginTop: '1.2rem',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={onMarkAsRead}
          disabled={isSavingProgress}
          style={{
            padding: '0.8rem 1.3rem',
            backgroundColor: isSavingProgress ? '#3B3150' : '#25004E',
            color: '#FFFFFF',
            border: '1px solid #B79CFF',
            borderRadius: '0.4rem',
            cursor: isSavingProgress ? 'not-allowed' : 'pointer',
            fontFamily: 'Overpass',
            fontSize: '0.9rem',
            boxShadow: '0 0 12px rgba(132, 0, 255, 0.22)',
            opacity: isSavingProgress ? 0.75 : 1,
          }}
        >
          {isSavingProgress ? 'Saving progress...' : 'Complete module'}
        </button>

        {trainingDocument.linkedQuizId ? (
          <Link
            to={trainingRoutes.quiz(trainingDocument.linkedQuizId)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.8rem 1.3rem',
              backgroundColor: '#8400FF',
              color: '#FFFFFF',
              border: '1px solid #FF00D4',
              borderRadius: '0.4rem',
              textDecoration: 'none',
              fontFamily: 'Overpass',
              fontSize: '0.9rem',
              boxShadow: '0 0 16px rgba(255, 0, 212, 0.35)',
            }}
          >
            Start linked quiz
          </Link>
        ) : null}
      </div>

      {progressError ? (
        <p
          style={{
            margin: '0.9rem 0 0',
            color: '#FFB7EF',
            fontFamily: 'Overpass',
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          {progressError}
        </p>
      ) : null}
    </article>
  );
}
