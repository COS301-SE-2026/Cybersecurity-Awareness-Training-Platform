import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { getHealth } from './lib/api';
import { AuthProvider } from './context/AuthContext';
import './App.css';

import { createBrowserRouter, Route, RouterProvider, Routes, useMatch } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import PublicPhishingPortalPage from './features/phishing-portals/PublicPhishingPortalPage';
import { PortalStatus } from './features/phishing-portals/PortalStatus';
import { isOrdinaryApplicationOrigin } from './frontendSurface';

const queryClient = new QueryClient();
const developmentOrigin = 'http://localhost:5173';

function PortalOnlyRoutes() {
  return (
    <Routes>
      <Route path="/p/:token" element={<PublicPhishingPortalPage />} />
      <Route path="*" element={<PortalStatus state="UNAVAILABLE" />} />
    </Routes>
  );
}

export function RoutedApp() {
  const isPortalPath = useMatch('/p/:token') !== null;
  const ordinaryOrigin =
    import.meta.env.VITE_FRONTEND_ORIGIN || (import.meta.env.DEV ? developmentOrigin : undefined);

  if (!isOrdinaryApplicationOrigin(window.location.href, ordinaryOrigin)) {
    return <PortalOnlyRoutes />;
  }

  if (isPortalPath) return <AppRoutes />;

  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

const router = createBrowserRouter([{ path: '*', element: <RoutedApp /> }]);

export function StatusPage() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    retry: false,
  });

  const apiStatus = health.isError ? 'not working' : (health.data?.api ?? 'checking');
  const databaseStatus = health.data?.database ?? 'checking';

  return (
    <main className="page">
      <section className="card">
        <p className="eyebrow">Project Cheesecake</p>
        <h1>Hello from Insightful Phish!</h1>

        <div className="status-list">
          <p>
            The API is <strong>{apiStatus}</strong>.
          </p>
          <p>
            The database is <strong>{databaseStatus}</strong>.
          </p>
        </div>

        {health.data?.timestamp ? (
          <p className="timestamp">Last checked: {health.data.timestamp}</p>
        ) : null}

        {health.isError ? (
          <p className="error">
            The frontend is running, but it could not reach the backend. Make sure the backend is
            running on port 4000.
          </p>
        ) : null}
      </section>
    </main>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
