export type ResolvedTrainingContent = {
  title?: string;
  body: string;
  format: 'html' | 'text';
};

const DEMO_TRAINING_CONTENT: Record<string, ResolvedTrainingContent> = {
  'demo://training/phishing-warning-signs': {
    format: 'html',
    body: `
      <h2>Phishing warning signs</h2>
      <p>Phishing messages often try to pressure you into acting quickly.</p>
      <ul>
        <li>Check the sender address carefully.</li>
        <li>Be careful with urgent payment, password, or account requests.</li>
        <li>Hover over links before opening them.</li>
        <li>Do not enter credentials after following suspicious links.</li>
      </ul>
    `,
  },

  'demo://training/safe-link-handling': {
    format: 'html',
    body: `
      <h2>Safe link handling</h2>
      <p>Before opening a link, confirm that the destination matches the expected website.</p>
      <ul>
        <li>Look for misspelled domains.</li>
        <li>Avoid shortened links in unexpected messages.</li>
        <li>Use bookmarks or manually type trusted URLs when possible.</li>
      </ul>
    `,
  },
};

export function resolveDemoTrainingContent(
  contentRef: string | null | undefined,
): ResolvedTrainingContent {
  if (!contentRef) {
    return {
      format: 'text',
      body: 'No training content reference was provided.',
    };
  }

  return (
    DEMO_TRAINING_CONTENT[contentRef] ?? {
      format: 'text',
      body: `Training content is not available for reference: ${contentRef}`,
    }
  );
}
