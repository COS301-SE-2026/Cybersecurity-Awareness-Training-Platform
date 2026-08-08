import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';

export default function TrainingModulesPage() {
  return (
    <AppLayout>
      <div
        style={{
          padding: '1.4rem 2rem 2.5rem',
          display: 'grid',
          gap: '1rem',
        }}
      >
        <header style={{ marginBottom: '1.8rem' }}>
          <p
            style={{
              margin: 0,
              color: '#FFB7EF',
              fontFamily: 'Jost',
              fontSize: '0.95rem',
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
            }}
          >
            UC-02 Training
          </p>

          <h1
            style={{
              margin: '0.3rem 0 0',
              color: '#FFFFFF',
              fontFamily: 'Jost',
              fontSize: '3.8rem',
              fontWeight: 500,
            }}
          >
            Training Modules
          </h1>

          <p
            style={{
              margin: '0.8rem 0 0',
              color: '#D8C7FF',
              fontFamily: 'Overpass',
              fontSize: '1.08rem',
              lineHeight: 1.7,
              maxWidth: '48rem',
            }}
          >
            Training access is now campaign-based. Open your assigned campaign to reach its training
            documents, quizzes, and simulations.
          </p>
        </header>

        <section
          style={{
            border: '1px solid rgba(255, 255, 255, 0.16)',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            padding: '1.3rem',
            maxWidth: '52rem',
          }}
        >
          <h2
            style={{
              margin: 0,
              color: '#FFFFFF',
              fontFamily: 'Jost',
              fontSize: '1.5rem',
              fontWeight: 500,
            }}
          >
            Training now lives inside campaigns
          </h2>

          <p
            style={{
              margin: '0.7rem 0 0',
              color: '#D8CCE8',
              fontFamily: 'Overpass',
              lineHeight: 1.7,
            }}
          >
            Use the campaigns page to discover assigned activities and open each training document
            by campaign item.
          </p>

          <Link
            to="/campaigns"
            style={{
              display: 'inline-flex',
              marginTop: '1rem',
              padding: '0.9rem 1.2rem',
              backgroundColor: '#8400FF',
              border: '1px solid #FF00D4',
              color: '#FFFFFF',
              textDecoration: 'none',
              fontFamily: 'Jost',
              fontWeight: 700,
            }}
          >
            Open campaigns
          </Link>
        </section>
      </div>
    </AppLayout>
  );
}
