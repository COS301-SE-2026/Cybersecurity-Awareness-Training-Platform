import { TrainingMarkdownContent } from './TrainingMarkdownContent';

type TrainingDocumentReaderProps = {
  title: string;
  contentType?: string | null;
  contentRef?: string | null;
  resolvedContent: string;
  resolvedFormat: 'html' | 'markdown' | 'text';
};

function renderSafeDemoHtml(html: string) {
  return { __html: html };
}

function TrainingDocumentReader({
  title,
  contentType,
  contentRef,
  resolvedContent,
  resolvedFormat,
}: TrainingDocumentReaderProps) {
  return (
    <article
      style={{
        border: '1px solid rgba(255, 255, 255, 0.16)',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          padding: '1.2rem 1.4rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
        }}
      >
        <h2
          style={{
            margin: 0,
            color: '#FFFFFF',
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
          {contentRef ? <span style={metaPillStyle}>Reference: {contentRef}</span> : null}
        </div>
      </header>

      {resolvedFormat === 'markdown' ? (
        <div style={contentBodyStyle}>
          <TrainingMarkdownContent content={resolvedContent} />
        </div>
      ) : resolvedFormat === 'html' ? (
        <div
          style={contentBodyStyle}
          dangerouslySetInnerHTML={renderSafeDemoHtml(resolvedContent)}
        />
      ) : (
        <div style={{ ...contentBodyStyle, whiteSpace: 'pre-wrap' }}>{resolvedContent}</div>
      )}
    </article>
  );
}

const metaPillStyle = {
  display: 'inline-flex',
  padding: '0.3rem 0.55rem',
  border: '1px solid rgba(255, 255, 255, 0.18)',
  color: '#BFA9DD',
  fontFamily: 'Jost',
  fontSize: '0.75rem',
  letterSpacing: '0.05em',
} as const;

const contentBodyStyle = {
  padding: '1.6rem 1.8rem',
  color: '#F4EEFF',
  fontFamily: 'Overpass',
  lineHeight: 1.8,
} as const;

export default TrainingDocumentReader;
export { TrainingDocumentReader };
