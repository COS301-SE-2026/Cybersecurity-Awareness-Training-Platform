import type { PortalTemplateId } from '@insightful-phish/shared';
import { useId, type ReactNode } from 'react';
import './phishing-portals.css';

type PortalLayoutProps = Readonly<{
  heading: string;
  children: ReactNode;
  templateId?: PortalTemplateId;
}>;

const templateClasses: Record<PortalTemplateId, string> = {
  GENERIC_ACCOUNT_LOGIN_V1: 'phishing-portal--account',
  GENERIC_DOCUMENT_ACCESS_V1: 'phishing-portal--document',
  GENERIC_BANKING_LOGIN_V1: 'phishing-portal--banking',
};

export function PortalLayout({ heading, children, templateId }: PortalLayoutProps) {
  const headingId = useId();
  const templateClass = templateId === undefined ? '' : ` ${templateClasses[templateId]}`;

  return (
    <main className={`phishing-portal${templateClass}`} aria-labelledby={headingId}>
      <div className="phishing-portal__panel">
        {templateId !== undefined && <div className="phishing-portal__mark" aria-hidden="true" />}
        <h1 id={headingId} className="phishing-portal__heading">
          {heading}
        </h1>
        <div className="phishing-portal__content">{children}</div>
      </div>
    </main>
  );
}
