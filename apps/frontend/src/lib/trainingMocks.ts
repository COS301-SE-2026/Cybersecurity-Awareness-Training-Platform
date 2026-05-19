import type { GetAssignedTrainingResponse, TrainingDocumentDetail } from './trainingApi';

export const mockAssignedTrainingResponse: GetAssignedTrainingResponse = {
  trainingDocuments: [
    {
      id: 'phishing-basics',
      title: 'Recognising Phishing Emails',
      description:
        'Learn how to spot suspicious senders, unsafe links, and urgent social-engineering language.',
      status: 'NOT_STARTED',
    },
    {
      id: 'password-safety',
      title: 'Password Safety',
      description:
        'Review strong password habits, password reuse risks, and multi-factor authentication basics.',
      status: 'STARTED',
    },
    {
      id: 'social-engineering',
      title: 'Social Engineering Awareness',
      description:
        'Understand how attackers manipulate people using urgency, authority, and impersonation.',
      status: 'COMPLETED',
    },
    {
      id: 'unavailable-training',
      title: 'Unpublished Security Policy Module',
      description: 'This module is assigned but the training content has not been published yet.',
      status: 'NOT_STARTED',
    },
  ],
};

export const mockTrainingDocumentDetails: Record<string, TrainingDocumentDetail> = {
  'phishing-basics': {
    id: 'phishing-basics',
    title: 'Recognising Phishing Emails',
    linkedQuizId: 'phishing-basics-quiz',
    contentMarkdown: `
# Recognising Phishing Emails

Phishing is a cyber attack where someone tries to trick you into revealing sensitive information or clicking something unsafe.

## Common warning signs

- The email creates urgency or fear.
- The sender address does not match the organisation.
- The message asks for passwords, banking details, or one-time pins.
- The link text looks normal, but the actual URL is suspicious.
- The attachment is unexpected or uses a strange file type.

## What you should do

Pause before clicking. Check the sender carefully. Do not enter credentials from an email link. Report suspicious emails to your security team.
`.trim(),
  },
  'password-safety': {
    id: 'password-safety',
    title: 'Password Safety',
    linkedQuizId: 'password-safety-quiz',
    contentMarkdown: `
# Password Safety

Passwords protect your work accounts, personal information, and organisation systems.

## Good password habits

- Use long passwords or passphrases.
- Do not reuse the same password across websites.
- Use a password manager where possible.
- Enable multi-factor authentication.
- Change passwords after suspected compromise.

## Why reuse is dangerous

If one website is breached, attackers may try the same email and password combination on other services.
`.trim(),
  },
  'social-engineering': {
    id: 'social-engineering',
    title: 'Social Engineering Awareness',
    contentMarkdown: `
# Social Engineering Awareness

Social engineering attacks target people instead of only technical systems.

## Common examples

- Fake support calls.
- Impersonation emails.
- Urgent payment requests.
- Messages pretending to come from managers.
- Requests to bypass normal approval steps.

## Safe response

Slow down. Verify unusual requests through a trusted channel before acting.
`.trim(),
  },
  'unavailable-training': {
    id: 'unavailable-training',
    title: 'Unpublished Security Policy Module',
    contentMarkdown: '',
  },
};
