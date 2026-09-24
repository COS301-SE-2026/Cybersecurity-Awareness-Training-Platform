import type { OrganisationEmailDraftInput } from '@insightful-phish/shared';
import { renderEmailPreviewHtml } from '../../lib/safeHtml';
import { toTitleCase } from '../../lib/email.utils';

type EmailPreviewProps = Readonly<{
  email: OrganisationEmailDraftInput;
}>;

export function EmailPreview({ email }: EmailPreviewProps) {
  return (
    <section className="email-preview" aria-labelledby="email-preview-heading">
      <header className="email-preview__header">
        <span>Subject</span>
        <h2 id="email-preview-heading">{toTitleCase(email.subject || 'Email subject')}</h2>
        <small>{email.preview || 'Preview text'}</small>
      </header>
      <div className="email-preview__metadata">
        <span>From</span>
        <strong>{email.senderLabel || 'Sender name'}</strong>
        <small>{email.senderAddress || 'sender@example.test'}</small>
      </div>
      <div
        className="email-preview__body email-body"
        onClickCapture={(event) => event.preventDefault()}
        dangerouslySetInnerHTML={{ __html: renderEmailPreviewHtml(email) }}
      />
    </section>
  );
}
