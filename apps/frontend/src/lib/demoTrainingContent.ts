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

  'demo://training/password-security-basics': {
    format: 'html',
    body: `
      <h2>Password security basics</h2>
      <p>Strong password habits reduce the impact of phishing, credential stuffing, and reused-password breaches.</p>
      <ul>
        <li>Use a unique password for every important account.</li>
        <li>Prefer long passphrases that are easier to remember and harder to guess.</li>
        <li>Use a password manager to create and store strong credentials safely.</li>
        <li>Turn on multi-factor authentication wherever it is available.</li>
        <li>If you suspect a breach, change the password quickly and review recent account activity.</li>
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
