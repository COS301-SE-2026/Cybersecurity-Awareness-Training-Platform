import { Routes, Route } from 'react-router-dom';
import { StatusPage } from '../App';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import InboxPage from '../pages/InboxPage';
import EmailDetailPage from '../pages/EmailDetailPage';
import TrainingDocumentPage from '../pages/TrainingDocumentPage';
import QuizPage from '../pages/QuizPage';
import ResultsPage from '../pages/ResultsPage';
import ProtectedRoute from './ProtectedRoute';
import CampaignsPage from '../pages/CampaignsPage';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/status" element={<StatusPage />} />
      <Route element={<ProtectedRoute />}>
        <Route
          path="/trainee/campaign-items/:campaignItemId/simulated-inbox"
          element={<InboxPage />}
        />

        <Route
          path="/trainee/campaign-items/:campaignItemId/simulated-emails/:emailId"
          element={<EmailDetailPage />}
        />

        {/* <Route path="/training/modules" element={<TrainingModulesPage />} /> */}

        {/* <Route path="/training/modules/:trainingId" element={<TrainingDocumentPage />} /> */}

        <Route path="/training/:campaignItemId" element={<TrainingDocumentPage />} />
        <Route path="/quizzes/:quizId" element={<QuizPage />} />
        <Route path="/quiz-attempts/:attemptId/results" element={<ResultsPage />} />
        <Route path="/campaigns" element={<CampaignsPage />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
