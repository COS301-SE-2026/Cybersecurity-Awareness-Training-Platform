export type ResolvedTrainingContent = {
  title?: string;
  body: string;
  format: 'html' | 'text';
};

type DemoHtmlTrainingContent = {
  heading: string;
  intro: string;
  bullets: string[];
};

function buildDemoHtmlTrainingContent(content: DemoHtmlTrainingContent): ResolvedTrainingContent {
  return {
    format: 'html',
    body: `
      <h2>${content.heading}</h2>
      <p>${content.intro}</p>
      <ul>
        ${content.bullets.map((bullet) => `<li>${bullet}</li>`).join('\n        ')}
      </ul>
    `,
  };
}

const DEMO_TRAINING_CONTENT: Record<string, ResolvedTrainingContent> = {
  'demo://training/phishing-warning-signs': buildDemoHtmlTrainingContent({
    heading: 'Phishing warning signs',
    intro: 'Phishing messages often try to pressure you into acting quickly.',
    bullets: [
      'Check the sender address carefully.',
      'Be careful with urgent payment, password, or account requests.',
      'Hover over links before opening them.',
      'Do not enter credentials after following suspicious links.',
    ],
  }),

  'demo://training/safe-link-handling': buildDemoHtmlTrainingContent({
    heading: 'Safe link handling',
    intro: 'Before opening a link, confirm that the destination matches the expected website.',
    bullets: [
      'Look for misspelled domains.',
      'Avoid shortened links in unexpected messages.',
      'Use bookmarks or manually type trusted URLs when possible.',
    ],
  }),

  'demo://training/password-security-basics': buildDemoHtmlTrainingContent({
    heading: 'Password security basics',
    intro:
      'Strong password habits reduce the impact of phishing, credential stuffing, and reused-password breaches.',
    bullets: [
      'Use a unique password for every important account.',
      'Prefer long passphrases that are easier to remember and harder to guess.',
      'Use a password manager to create and store strong credentials safely.',
      'Turn on multi-factor authentication wherever it is available.',
      'If you suspect a breach, change the password quickly and review recent account activity.',
    ],
  }),
};

export function resolveDemoTrainingContent(
  contentRef: string | null | undefined,
): ResolvedTrainingContent {
  if (!contentRef) {
    return {
      format: 'text',
      body: 'Training content is not available for this document.',
    };
  }

  return (
    DEMO_TRAINING_CONTENT[contentRef] ?? {
      format: 'text',
      body: 'Training content is not available for this document.',
    }
  );
}
