import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';

export type ContentManagementSection = 'simulated-inboxes' | 'email-library';

export function ContentManagementShell({
  organisationId,
  section,
  children,
}: Readonly<{
  organisationId: string;
  section: ContentManagementSection;
  children: ReactNode;
}>) {
  const root = `/organisations/${encodeURIComponent(organisationId)}/content`;

  return (
    <AppLayout contentStyle={{ backgroundColor: 'white' }}>
      <main className="content-management-page">
        <header className="content-management-page__header">
          <h1>Content Management</h1>
          <p>Create and manage reusable simulation content for your organisation.</p>
        </header>
        <nav className="content-management-tabs" aria-label="Content management sections">
          <Link
            to={`${root}/simulated-inboxes`}
            aria-current={section === 'simulated-inboxes' ? 'page' : undefined}
          >
            Simulated Inboxes
          </Link>
          <Link
            to={`${root}/email-library`}
            aria-current={section === 'email-library' ? 'page' : undefined}
          >
            Email Library
          </Link>
        </nav>
        {children}
      </main>
    </AppLayout>
  );
}
