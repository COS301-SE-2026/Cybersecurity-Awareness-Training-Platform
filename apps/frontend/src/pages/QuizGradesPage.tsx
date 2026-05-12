import AppLayout from '../components/layout/AppLayout';

function QuizGradesPage() {
  return (
    <AppLayout>
      <div
        style={{
          padding: '1.4rem',
          paddingBottom: '0.8rem',
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
      >
        <h1
          style={{
            margin: 0,
            marginBottom: '1.6rem',
            fontSize: '3.8rem',
            fontWeight: 500,
            lineHeight: 1,
            color: 'white',
            fontFamily: 'Jost',
          }}
        >
          Quiz Grades
        </h1>
      </div>
    </AppLayout>
  );
}

export default QuizGradesPage;
