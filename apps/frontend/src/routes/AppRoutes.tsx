import { Routes, Route } from 'react-router-dom';
import { StatusPage } from '../App';
import { useAuth } from '../context/useAuth';
import type { CampaignManagementContext } from '../features/campaign-management/campaignManagement.types';
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
import NotFoundPage from '../pages/NotFoundPage';
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
import BrandPage from '../pages/BrandPage';
import CampaignAssignmentPage from '../pages/CampaignAssignmentPage';
import CampaignManagementListPage from '../features/campaign-management/CampaignManagementListPage';
import CampaignManagementDetailPage from '../features/campaign-management/CampaignManagementDetailPage';
import QuizCreatorPage from '../features/quiz-authoring/QuizCreatorPage';
import { PlatformQuizManagementPage } from '../features/content-management/QuizManagementSection';
import CampaignInsightsPage from '../pages/CampaignInsightsPage';
import TrainingDocumentCreatorPage from '../features/training-document-authoring/TrainingDocumentCreatorPage';
import OrganisationContentManagementPage from '../features/content-management/OrganisationContentManagementPage';
import SimulatedInboxManagementPage from '../features/content-management/SimulatedInboxManagementPage';
import RealEmailFeedbackPage from '../pages/RealEmailFeedbackPage';
import PublicPhishingPortalPage from '../features/phishing-portals/PublicPhishingPortalPage';

function CampaignManagementDetailRoute({
  contextKind,
}: Readonly<{ contextKind: CampaignManagementContext['kind'] }>) {
  const { clearAuth, permissions } = useAuth();
  const canManageCampaigns = contextKind === 'platform' || permissions.includes('MANAGE_CAMPAIGNS');

  return (
    <CampaignManagementDetailPage
      contextKind={contextKind}
      canManageCampaigns={canManageCampaigns}
      blockUnsavedNavigation
      onAuthenticationExpired={clearAuth}
    />
  );
}

function CampaignInsightsRoute() {
  const { clearAuth, permissions } = useAuth();

  return (
    <CampaignInsightsPage
      canAssignCampaigns={permissions.includes('ASSIGN_CAMPAIGNS')}
      onAuthenticationExpired={clearAuth}
    />
  );
}

function TrainingDocumentCreatorRoute({
  contextKind,
}: Readonly<{ contextKind: 'organisation' | 'platform' }>) {
  const { clearAuth } = useAuth();

  return (
    <TrainingDocumentCreatorPage contextKind={contextKind} onAuthenticationExpired={clearAuth} />
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/confirm-email-change" element={<ConfirmEmailChangePage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/setup/token/:token" element={<SetupPage />} />
      <Route
        path="/organisation-registration-request"
        element={<OrganisationRegistrationRequestPage />}
      />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />
      <Route path="/accept-invite/:token" element={<AcceptInvitePage />} />
      <Route path="/status" element={<StatusPage />} />
      <Route path="/brand" element={<BrandPage />} />
      <Route path="/phishing-simulations/feedback/:token" element={<RealEmailFeedbackPage />} />
      <Route path="/p/:token" element={<PublicPhishingPortalPage />} />

      {/* TRAINEE PROTECTED ROUTES */}
      <Route
        element={<ProtectedRoute allowedRoles={['GENERAL_TRAINEE', 'ORGANISATION_TRAINEE']} />}
      >
        <Route path="/campaigns" element={<CampaignsPage />} />
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
      </Route>

      {/* ORGANISATION ADMIN PROTECTED ROUTES */}
      <Route element={<ProtectedRoute allowedRoles={['ORGANISATION_ADMIN']} requireOrganisation />}>
        <Route path="/organisation-information" element={<OrganisationInformationPage />} />
        <Route
          path="/organisation-security-preferences"
          element={<OrganisationSecuritySettingsPage />}
        />
        <Route
          element={
            <ProtectedRoute
              allowedRoles={['ORGANISATION_ADMIN']}
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
              allowedRoles={['ORGANISATION_ADMIN']}
              requireOrganisation
              requiredPermission="VIEW_ORGANISATION_ADMINS"
            />
          }
        >
          <Route path="/organisation-administrators" element={<OrganisationAdministratorsPage />} />
        </Route>
        <Route
          element={
            <ProtectedRoute
              allowedRoles={['ORGANISATION_ADMIN']}
              requireOrganisation
              requiredPermission="ASSIGN_CAMPAIGNS"
            />
          }
        >
          <Route
            path="/organisations/:organisationId/campaign-assignments/new"
            element={<CampaignAssignmentPage />}
          />
        </Route>

        <Route
          element={
            <ProtectedRoute
              requireOrganisation
              requiredAnyPermission={['VIEW_CAMPAIGNS', 'MANAGE_CAMPAIGNS']}
            />
          }
        >
          <Route
            path="/organisations/:organisationId/content"
            element={<OrganisationContentManagementPage section="email-library" />}
          />
          <Route
            path="/organisations/:organisationId/content/email-library"
            element={<OrganisationContentManagementPage section="email-library" />}
          />
          <Route
            path="/organisations/:organisationId/content/simulated-inboxes"
            element={<OrganisationContentManagementPage section="simulated-inboxes" />}
          />
          <Route
            path="/organisations/:organisationId/content/training-documents"
            element={<OrganisationContentManagementPage section="training-documents" />}
          />
          <Route
            path="/organisations/:organisationId/content/simulated-inboxes/:simulationId"
            element={<SimulatedInboxManagementPage blockUnsavedNavigation />}
          />
        </Route>

        <Route
          element={
            <ProtectedRoute
              requireOrganisation
              requiredAnyPermission={['VIEW_CAMPAIGNS', 'MANAGE_CAMPAIGNS']}
            />
          }
        >
          <Route
            path="/organisations/:organisationId/campaigns"
            element={<CampaignManagementListPage contextKind="organisation" />}
          />
          <Route
            path="/organisations/:organisationId/campaigns/:campaignId"
            element={<CampaignManagementDetailRoute contextKind="organisation" />}
          />
          <Route
            path="/organisations/:organisationId/campaigns/:campaignId/statistics"
            element={<CampaignInsightsRoute />}
          />
        </Route>

        <Route
          element={<ProtectedRoute requireOrganisation requiredPermission="MANAGE_CAMPAIGNS" />}
        >
          <Route
            path="/organisations/:organisationId/content/simulated-inboxes/new"
            element={<SimulatedInboxManagementPage blockUnsavedNavigation />}
          />
          <Route
            path="/organisations/:organisationId/campaigns/new"
            element={<CampaignManagementDetailRoute contextKind="organisation" />}
          />
          <Route
            path="/organisations/:organisationId/content/quizzes"
            element={<OrganisationContentManagementPage section="quizzes" />}
          />
          <Route
            path="/organisations/:organisationId/quizzes/new"
            element={<QuizCreatorPage contextKind="organisation" />}
          />
          <Route
            path="/organisations/:organisationId/quizzes/:quizId"
            element={<QuizCreatorPage contextKind="organisation" />}
          />
          <Route
            path="/organisations/:organisationId/training-documents/new"
            element={<TrainingDocumentCreatorRoute contextKind="organisation" />}
          />
          <Route
            path="/organisations/:organisationId/training-documents/:trainingDocumentId"
            element={<TrainingDocumentCreatorRoute contextKind="organisation" />}
          />
        </Route>
      </Route>

      {/* PLATFORM ADMIN PROTECTED ROUTES */}
      <Route element={<ProtectedRoute allowedRoles={['IP_ADMIN']} />}>
        <Route path="/organisation-management" element={<PlatformOrganisationManagementPage />} />
        <Route
          path="/platform/organisations/:organisationId"
          element={<OrganisationInformationPage />}
        />
        <Route
          path="/platform/organisation-requests/:requestId"
          element={<OrganisationInformationPage />}
        />
        <Route path="/platform-administrators" element={<PlatformAdministratorsPage />} />
        <Route
          path="/platform/campaigns"
          element={<CampaignManagementListPage contextKind="platform" />}
        />
        <Route
          path="/platform/campaigns/new"
          element={<CampaignManagementDetailRoute contextKind="platform" />}
        />
        <Route
          path="/platform/campaigns/:campaignId"
          element={<CampaignManagementDetailRoute contextKind="platform" />}
        />
        <Route path="/platform/quizzes" element={<PlatformQuizManagementPage />} />
        <Route path="/platform/quizzes/new" element={<QuizCreatorPage contextKind="platform" />} />
        <Route
          path="/platform/quizzes/:quizId"
          element={<QuizCreatorPage contextKind="platform" />}
        />
        <Route
          path="/platform/training-documents/new"
          element={<TrainingDocumentCreatorRoute contextKind="platform" />}
        />
        <Route
          path="/platform/training-documents/:trainingDocumentId"
          element={<TrainingDocumentCreatorRoute contextKind="platform" />}
        />
      </Route>

      {/* GENERAL PROTECTED ROUTES (ANY AUTHENTICATED USER) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/account-management" element={<AccountManagementPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRoutes;
