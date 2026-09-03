interface TrainingMarkdownContentProps {
  content: string;
}

export function TrainingMarkdownContent({ content }: TrainingMarkdownContentProps) {
  const lines = content.split('\n');

  return (
    <div
      style={{
        color: '#374151',
        fontFamily: 'Overpass',
        fontSize: '1.05rem',
        lineHeight: 1.85,
      }}
    >
      {lines.map((line, index) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={index} style={{ height: '0.5rem' }} />;
        }

        if (trimmed.startsWith('# ')) {
          return (
            <h2
              key={index}
              style={{
                margin: '0 0 1rem',
                color: 'var(--ip-deep-purple)',
                fontFamily: 'Jost',
                fontSize: '2.3rem',
                fontWeight: 500,
              }}
            >
              {trimmed.replace('# ', '')}
            </h2>
          );
        }

        if (trimmed.startsWith('## ')) {
          return (
            <h3
              key={index}
              style={{
                margin: '1.8rem 0 0.6rem',
                color: 'var(--ip-dark-pink)',
                fontFamily: 'Jost',
                fontSize: '1.55rem',
                fontWeight: 500,
              }}
            >
              {trimmed.replace('## ', '')}
            </h3>
          );
        }

        if (trimmed.startsWith('- ')) {
          return (
            <p
              key={index}
              style={{
                margin: '0.45rem 0 0.45rem 1rem',
                color: '#374151',
              }}
            >
              • {trimmed.replace('- ', '')}
            </p>
          );
        }

        return (
          <p key={index} style={{ margin: '0.75rem 0' }}>
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}
