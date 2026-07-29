import { Routes, Route, Navigate } from 'react-router-dom';
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
import LandingPage from '../pages/LandingPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import OrganisationRegistrationRequestPage from '../pages/OrganisationRegistrationRequestPage';
import AccountManagementPage from '../pages/AccountManagementPage';
import SetupPage from '../pages/SetupPage';
import AcceptInvitePage from '../pages/AcceptInvitePage';
import VerifyEmailPage from '../pages/VerifyEmailPage';
import ConfirmEmailChangePage from '../pages/ConfirmEmailChangePage';
import OrganisationInformationPage from '../pages/OrganisationInformationPage';
import OrganisationSecuritySettingsPage from '../pages/OrganisationSecuritySettingsPage';
import PlatformOrganisationManagementPage from '../pages/PlatformOrganisationManagementPage';
import OrganisationTraineesPage from '../pages/OrganisationTraineesPage';
import OrganisationAdministratorsPage from '../pages/OrganisationAdministratorsPage';
import PlatformAdministratorsPage from '../pages/PlatformAdministratorsPage';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/confirm-email-change" element={<ConfirmEmailChangePage />} />
      <Route path="/setup/token/:token" element={<SetupPage />} />
      <Route path="/status" element={<StatusPage />} />

      {/* PROTECTED ROUTES */}
      <Route element={<ProtectedRoute />}>
        <Route
          path="/trainee/campaign-items/:campaignItemId/simulated-inbox"
          element={<InboxPage />}
        />

        <Route
          path="/trainee/campaign-items/:campaignItemId/simulated-emails/:emailId"
          element={<EmailDetailPage />}
        />

        <Route path="/training/:campaignItemId" element={<TrainingDocumentPage />} />
        <Route path="/quizzes/:quizId" element={<QuizPage />} />
        <Route path="/quiz-attempts/:attemptId/results" element={<ResultsPage />} />
        <Route path="/campaigns" element={<CampaignsPage />} />

        {/* ACCOUNT MANAGEMENT PROTECTED ROUTE */}
        <Route path="/account-management" element={<AccountManagementPage />} />

        {/* ORGANISATION DETAILS PROTECTED ROUTES */}
        <Route path="/organisation-information" element={<OrganisationInformationPage />} />
        <Route path="/organisation-information/:id" element={<OrganisationInformationPage />} />
        <Route
          path="/platform/organisations/:organisationId"
          element={<OrganisationInformationPage />}
        />
        <Route
          path="/platform/organisation-requests/:requestId"
          element={<OrganisationInformationPage />}
        />
        <Route
          path="/organisation-security-preferences"
          element={<OrganisationSecuritySettingsPage />}
        />
        <Route path="/organisation-management" element={<PlatformOrganisationManagementPage />} />
        <Route
          element={
            <ProtectedRoute
              requiredRole="ORGANISATION_ADMIN"
              requireOrganisation
              requiredPermission="VIEW_ORGANISATION_TRAINEES"
            />
          }
        >
          <Route path="/organisation-trainees" element={<OrganisationTraineesPage />} />
        </Route>
        <Route
          element={
            <ProtectedRoute
              requiredRole="ORGANISATION_ADMIN"
              requireOrganisation
              requiredPermission="VIEW_ORGANISATION_ADMINS"
            />
          }
        >
          <Route path="/organisation-administrators" element={<OrganisationAdministratorsPage />} />
        </Route>
      </Route>

      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/organisation-registration-request"
        element={<OrganisationRegistrationRequestPage />}
      />

      {/* ACCEPT INVITE ROUTE */}
      <Route path="/accept-invite" element={<AcceptInvitePage />} />
      <Route path="/accept-invite/:token" element={<AcceptInvitePage />} />

      <Route path="/" element={<LandingPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
      <Route path="/platform-administrators" element={<PlatformAdministratorsPage />} />
    </Routes>
  );
}

export default AppRoutes;
