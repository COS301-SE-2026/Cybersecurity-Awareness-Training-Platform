import Navbar from './Navbar';
import Sidebar from './Sidebar';
import type { CSSProperties, ReactNode } from 'react';

type AppLayoutProps = {
  children: ReactNode;
  showSidebar?: boolean;
  contentStyle?: CSSProperties;
  className?: string;
};

function AppLayout({ children, showSidebar = true, contentStyle, className }: AppLayoutProps) {
  return (
    <main
      className={className}
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#0E0020',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Jost',
      }}
    >
      <Navbar />

      <div
        className="app-layout__body"
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        {showSidebar ? <Sidebar /> : null}

        <section
          className="app-layout__content"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflow: 'auto',
            height: '100%',
            backgroundColor: '#0E0020',
            ...contentStyle,
          }}
        >
          {children}
        </section>
      </div>
    </main>
  );
}

export default AppLayout;
