import { TrainingMarkdownContent } from './TrainingMarkdownContent';
import { sanitizeSafeHtml } from '../../lib/safeHtml';

type TrainingDocumentReaderProps = Readonly<{
  resolvedContent: string;
  resolvedFormat: 'html' | 'markdown' | 'text';
}>;

function TrainingDocumentReader({ resolvedContent, resolvedFormat }: TrainingDocumentReaderProps) {
  function renderContent() {
    if (resolvedFormat === 'markdown') {
      return (
        <div className="training-document-reader__content" style={contentBodyStyle}>
          <TrainingMarkdownContent content={resolvedContent} />
        </div>
      );
    }

    if (resolvedFormat === 'html') {
      const sanitizedHtml = sanitizeSafeHtml(resolvedContent);

      return (
        <div
          className="training-document-reader__content"
          style={contentBodyStyle}
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      );
    }

    return (
      <div
        className="training-document-reader__content"
        style={{ ...contentBodyStyle, whiteSpace: 'pre-wrap' }}
      >
        {resolvedContent}
      </div>
    );
  }

  return (
    <article
      aria-label="Training Content"
      style={{
        border: '1px solid var(--ip-bg-purple)',
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
      }}
    >
      {renderContent()}
    </article>
  );
}

const contentBodyStyle = {
  padding: '1.6rem 1.8rem',
  color: '#374151',
  fontFamily: 'var(--overpass)',
  lineHeight: 1.6,
  fontSize: '1.05rem',
} as const;

export default TrainingDocumentReader;
export { TrainingDocumentReader };
