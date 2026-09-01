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
import CampaignInsightsPage from '../pages/CampaignInsightsPage';

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
  const { clearAuth } = useAuth();

  return <CampaignInsightsPage onAuthenticationExpired={clearAuth} />;
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
            path="/organisations/:organisationId/campaigns/new"
            element={<CampaignManagementDetailRoute contextKind="organisation" />}
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
