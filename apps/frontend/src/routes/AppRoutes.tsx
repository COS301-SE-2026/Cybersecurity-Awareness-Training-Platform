import { Routes, Route } from 'react-router-dom';
import { StatusPage } from '../App';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
// import DashboardPage from '../pages/DashboardPage';
import InboxPage from '../pages/InboxPage';
import EmailDetailPage from '../pages/EmailDetailPage';
// import TrainingModulesPage from '../pages/TrainingModulesPage';
// import TrainingDocumentPage from '../pages/TrainingDocumentPage';
import QuizPage from '../pages/QuizPage';
// import ResultsPage from '../pages/ResultsPage';
// import FeedbackPage from '../pages/FeedbackPage';
// import QuizGradesPage from '../pages/QuizGradesPage';
import ProtectedRoute from './ProtectedRoute';
import CampaignsPage from '../pages/CampaignsPage';
function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/status" element={<StatusPage />} />
      <Route element={<ProtectedRoute />}>
        {/* <Route path="/dashboard" element={<DashboardPage />} /> */}

        <Route path="/simulation/inbox" element={<InboxPage />} />
        <Route
          path="/trainee/campaign-items/:campaignItemId/simulated-inbox"
          element={<InboxPage />}
        />

        <Route path="/simulation/inbox/:emailId" element={<EmailDetailPage />} />

        {/* <Route path="/training/modules" element={<TrainingModulesPage />} /> */}

        {/* <Route path="/training/modules/:trainingId" element={<TrainingDocumentPage />} /> */}

        <Route path="/quizzes/:quizId" element={<QuizPage />} />

        {/* <Route path="/quiz/grades" element={<QuizGradesPage />} /> */}

        {/* <Route path="/results/:attemptId" element={<ResultsPage />} /> */}

        {/* <Route path="/feedback" element={<FeedbackPage />} /> */}

        <Route path="/campaigns" element={<CampaignsPage />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
