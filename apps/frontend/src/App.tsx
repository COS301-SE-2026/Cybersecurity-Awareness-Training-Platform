import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { getHealth } from './lib/api';
import './App.css';

import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';

const queryClient = new QueryClient();

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
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
