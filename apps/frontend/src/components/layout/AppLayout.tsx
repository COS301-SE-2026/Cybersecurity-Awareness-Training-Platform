import Navbar from './Navbar';
import Sidebar from './Sidebar';
import type { CSSProperties, ReactNode } from 'react';

type AppLayoutProps = {
  children: ReactNode;
  showSidebar?: boolean;
  contentStyle?: CSSProperties;
};

function AppLayout({ children, showSidebar = true, contentStyle }: AppLayoutProps) {
  return (
    <main
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
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        {showSidebar ? <Sidebar /> : null}

        <section
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
