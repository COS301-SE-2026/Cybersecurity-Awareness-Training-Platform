import { Link } from 'react-router-dom';
import { trainingRoutes } from '../../lib/trainingApi';

interface TrainingQuizCallToActionProps {
  linkedQuizId: string;
}

export function TrainingQuizCallToAction({ linkedQuizId }: TrainingQuizCallToActionProps) {
  return (
    <section
      style={{
        marginTop: '1.5rem',
        border: '1px solid rgba(0, 187, 255, 0.75)',
        backgroundColor: 'rgba(0, 187, 255, 0.1)',
        boxShadow: '0 0 18px rgba(0, 187, 255, 0.16)',
        padding: '1.4rem',
      }}
    >
      <h2
        style={{
          margin: 0,
          color: '#AEEAFF',
          fontFamily: 'Jost',
          fontSize: '1.6rem',
          fontWeight: 500,
        }}
      >
        Ready to test your understanding?
      </h2>

      <p
        style={{
          margin: '0.6rem 0 0',
          color: '#D8F5FF',
          fontFamily: 'Overpass',
          lineHeight: 1.6,
        }}
      >
        Complete the linked quiz for this training module.
      </p>

      <Link
        to={trainingRoutes.quiz(linkedQuizId)}
        style={{
          display: 'inline-flex',
          marginTop: '1.1rem',
          padding: '0.85rem 1.2rem',
          backgroundColor: '#005C86',
          color: '#FFFFFF',
          border: '1px solid #00BBFF',
          textDecoration: 'none',
          fontFamily: 'Jost',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        Start Quiz
      </Link>
    </section>
  );
}
