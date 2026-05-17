import Navbar from './Navbar';
import Sidebar from './Sidebar';
import type { ReactNode } from 'react';

type AppLayoutProps = {
  children: ReactNode;
};

function AppLayout({ children }: AppLayoutProps) {
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
        <Sidebar />

        <section
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflow: 'hidden',
            height: '100%',
          }}
        >
          {children}
        </section>
      </div>
    </main>
  );
}

export default AppLayout;
