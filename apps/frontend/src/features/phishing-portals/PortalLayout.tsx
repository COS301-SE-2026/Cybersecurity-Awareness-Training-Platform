import type { PortalTemplateId } from '@insightful-phish/shared';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import './phishing-portals.css';

type PortalLayoutProps = Readonly<{
  heading: string;
  children: ReactNode;
  templateId?: PortalTemplateId;
  focusHeading?: boolean;
  isBusy?: boolean;
}>;

const templateClasses: Record<PortalTemplateId, string> = {
  GENERIC_ACCOUNT_LOGIN_V1: 'phishing-portal--account',
  GENERIC_DOCUMENT_ACCESS_V1: 'phishing-portal--document',
  GENERIC_BANKING_LOGIN_V1: 'phishing-portal--banking',
};

export function PortalLayout({
  heading,
  children,
  templateId,
  focusHeading = false,
  isBusy = false,
}: PortalLayoutProps) {
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const templateClass = templateId === undefined ? '' : ` ${templateClasses[templateId]}`;

  useEffect(() => {
    if (focusHeading !== true) {
      return;
    }

    headingRef.current?.focus();
  }, [focusHeading]);

  return (
    <main
      className={`phishing-portal${templateClass}`}
      aria-labelledby={headingId}
      aria-busy={isBusy}
    >
      <div className="phishing-portal__panel">
        {templateId !== undefined && <div className="phishing-portal__mark" aria-hidden="true" />}
        <h1
          ref={headingRef}
          id={headingId}
          className="phishing-portal__heading"
          tabIndex={focusHeading === true ? -1 : undefined}
        >
          {heading}
        </h1>
        <div className="phishing-portal__content">{children}</div>
      </div>
    </main>
  );
}
