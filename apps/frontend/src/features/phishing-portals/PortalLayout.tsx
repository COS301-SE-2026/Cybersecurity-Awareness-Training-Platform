import { useId, type ReactNode } from 'react';
import './phishing-portals.css';

type PortalLayoutProps = Readonly<{
  heading: string;
  children: ReactNode;
}>;

export function PortalLayout({ heading, children }: PortalLayoutProps) {
  const headingId = useId();

  return (
    <main className="phishing-portal" aria-labelledby={headingId}>
      <div className="phishing-portal__panel">
        <h1 id={headingId} className="phishing-portal__heading">
          {heading}
        </h1>
        <div className="phishing-portal__content">{children}</div>
      </div>
    </main>
  );
}
