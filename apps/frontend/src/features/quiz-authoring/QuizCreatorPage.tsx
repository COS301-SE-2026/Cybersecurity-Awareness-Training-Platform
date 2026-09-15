import { Navigate, useParams } from 'react-router-dom';

import AppLayout from '../../components/layout/AppLayout';
import { useAuth } from '../../context/useAuth';
import type { QuizAuthoringScope } from './quizAuthoringClient';

type QuizCreatorPageProps = Readonly<{
  contextKind: QuizAuthoringScope['kind'];
}>;

function QuizCreatorPage({ contextKind }: QuizCreatorPageProps) {
  const { organisationId, quizId } = useParams<{
    organisationId: string;
    quizId: string;
  }>();
  const { authContext } = useAuth();

  if (
    contextKind === 'organisation' &&
    (!organisationId || organisationId !== authContext?.organisation?.id)
  ) {
    return <Navigate to="/organisation-information" replace />;
  }

  return (
    <AppLayout contentStyle={{ backgroundColor: 'white' }}>
      <section className="p-8">
        <h1 className="font-jost text-4xl font-medium tracking-wider text-purple">Quiz Creator</h1>
        <p className="mt-3 font-overpass text-lg text-dark-pink">
          {quizId ? 'Existing Quiz authoring route loaded' : 'New Quiz authoring route loaded.'}
        </p>
      </section>
    </AppLayout>
  );
}

export default QuizCreatorPage;
