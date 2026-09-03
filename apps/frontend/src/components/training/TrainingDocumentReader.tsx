import { TrainingMarkdownContent } from './TrainingMarkdownContent';
import { sanitizeSafeHtml } from '../../lib/safeHtml';

type TrainingDocumentReaderProps = Readonly<{
  title: string;
  contentType?: string | null;
  resolvedContent: string;
  resolvedFormat: 'html' | 'markdown' | 'text';
}>;

function TrainingDocumentReader({
  title,
  contentType,
  resolvedContent,
  resolvedFormat,
}: TrainingDocumentReaderProps) {
  function renderContent() {
    if (resolvedFormat === 'markdown') {
      return (
        <div style={contentBodyStyle}>
          <TrainingMarkdownContent content={resolvedContent} />
        </div>
      );
    }

    if (resolvedFormat === 'html') {
      const sanitizedHtml = sanitizeSafeHtml(resolvedContent);

      return <div style={contentBodyStyle} dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
    }

    return <div style={{ ...contentBodyStyle, whiteSpace: 'pre-wrap' }}>{resolvedContent}</div>;
  }

  return (
    <article
      style={{
        border: '1px solid var(--ip-bg-purple)',
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          padding: '1.2rem 1.4rem',
          borderBottom: '1px solid var(--ip-bg-purple)',
          backgroundColor: 'var(--ip-faint-purple)',
        }}
      >
        <h2
          style={{
            margin: 0,
            color: 'var(--ip-deep-purple)',
            fontFamily: 'Jost',
            fontSize: '1.6rem',
            fontWeight: 500,
          }}
        >
          {title}
        </h2>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.6rem',
            marginTop: '0.75rem',
          }}
        >
          {contentType ? <span style={metaPillStyle}>Type: {contentType}</span> : null}
        </div>
      </header>

      {renderContent()}
    </article>
  );
}

const metaPillStyle = {
  display: 'inline-flex',
  padding: '0.3rem 0.55rem',
  border: '1px solid var(--ip-bg-purple)',
  color: 'var(--ip-dark-pink)',
  fontFamily: 'Jost',
  fontSize: '0.75rem',
  letterSpacing: '0.05em',
} as const;

const contentBodyStyle = {
  padding: '1.6rem 1.8rem',
  color: '#374151',
  fontFamily: 'Overpass',
  lineHeight: 1.8,
} as const;

export default TrainingDocumentReader;
export { TrainingDocumentReader };
