import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../context/useAuth';

type NotFoundContentProps = Readonly<{
  returnTo: string;
  actionText: string;
}>;

function NotFoundContent({ returnTo, actionText }: NotFoundContentProps) {
  return (
    <section className="bg-white-purple border border-default shadow-md" style={cardStyle}>
      <h1 style={headingStyle}>Page not found</h1>
      <p style={messageStyle}>The page you requested does not exist or may have been moved.</p>
      <Link to={returnTo} className="bg-main-purple hover:bg-hover-purple" style={linkStyle}>
        {actionText}
      </Link>
    </section>
  );
}

function NotFoundPage() {
  const { isAuthenticated, isAuthLoading, redirectTo } = useAuth();

  if (isAuthLoading) {
    return (
      <main style={standalonePageStyle}>
        <p style={loadingTextStyle}>Loading current user...</p>
      </main>
    );
  }
  if (isAuthenticated) {
    return (
      <AppLayout>
        <div style={contentContainerStyle}>
          <NotFoundContent returnTo={redirectTo ?? '/'} actionText="Return to dashboard" />
        </div>
      </AppLayout>
    );
  }

  return (
    <main style={standalonePageStyle}>
      <NotFoundContent returnTo="/" actionText="Return to home" />
    </main>
  );
}

const standalonePageStyle = {
  width: '100vw',
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem',
  boxSizing: 'border-box',
  backgroundColor: 'var(--ip-light-bg-purple)',
  fontFamily: 'Jost',
} satisfies CSSProperties;

const contentContainerStyle = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem',
  boxSizing: 'border-box',
  backgroundColor: 'var(--ip-light-bg-purple)',
} satisfies CSSProperties;

const cardStyle = {
  width: 'min(100%, 36rem)',
  display: 'grid',
  gap: '1.25rem',
  padding: '2.5rem',
  boxSizing: 'border-box',
} satisfies CSSProperties;

const headingStyle = {
  margin: 0,
  color: 'var(--ip-purple)',
  fontSize: '3rem',
  fontWeight: 600,
  lineHeight: 1.1,
} satisfies CSSProperties;

const messageStyle = {
  margin: 0,
  color: 'var(--ip-dark-pink)',
  fontFamily: 'var(--overpass)',
  fontSize: '1.2rem',
  lineHeight: 1.5,
} satisfies CSSProperties;

const linkStyle = {
  width: 'fit-content',
  padding: '0.75rem 1rem',
  color: 'white',
  fontSize: '1.1rem',
  fontWeight: 600,
  textDecoration: 'none',
} satisfies CSSProperties;

const loadingTextStyle = {
  margin: 0,
  color: 'var(--ip-purple)',
  fontSize: '1.5rem',
} satisfies CSSProperties;

export default NotFoundPage;
