import type { OrganisationEmailDraftInput } from '@insightful-phish/shared';
import { renderEmailPreviewHtml } from '../../lib/safeHtml';

type EmailPreviewProps = Readonly<{
  email: OrganisationEmailDraftInput;
}>;

export function EmailPreview({ email }: EmailPreviewProps) {
  return (
    <section className="email-preview" aria-labelledby="email-preview-heading">
      <h2 id="email-preview-heading">Preview</h2>
      <div className="email-preview__metadata">
        <div>
          <span>From</span>
          <strong>{email.senderLabel || 'Sender name'}</strong>
          <small>{email.senderAddress || 'sender@example.test'}</small>
        </div>
        <div>
          <span>Subject</span>
          <strong>{email.subject || 'Email subject'}</strong>
          <small>{email.preview || 'Preview text'}</small>
        </div>
      </div>
      <div
        className="email-preview__body email-body"
        onClickCapture={(event) => event.preventDefault()}
        dangerouslySetInnerHTML={{ __html: renderEmailPreviewHtml(email) }}
      />
    </section>
  );
}
