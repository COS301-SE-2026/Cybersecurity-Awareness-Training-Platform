import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserTypeDto } from '@insightful-phish/shared';
import * as organisationDetailsService from '../../services/organisation-details.service';
import { createAuthContextValue, renderWithRouter } from '../../testing/render';

vi.mock('../../App', () => ({
  StatusPage: () => <h1>Status Page</h1>,
  default: () => null,
}));

vi.mock('../../components/layout/AppLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../components/ui/CampaignAccordion', () => ({
  default: ({
    subtitle,
    children,
    isOpen,
    onToggle,
  }: {
    subtitle: string;
    children?: ReactNode;
    isOpen: boolean;
    onToggle: () => void;
  }) => (
    <section>
      <button type="button" onClick={onToggle}>
        {subtitle}
      </button>
      {isOpen ? <div>{children}</div> : null}
    </section>
  ),
}));

vi.mock('../../components/ui/TrainingPartAccordion', () => ({
  default: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../components/ui/TrainingActionRow', () => ({
  default: ({
    label,
    onClick,
    disabled,
  }: {
    label: string;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {label}
    </button>
  ),
}));

vi.mock('../../pages/InboxPage', () => ({
  default: () => <h1>Simulated Email Inbox</h1>,
}));

vi.mock('../../pages/EmailDetailPage', () => ({
  default: () => <h1>Simulated Email</h1>,
}));

vi.mock('../../pages/TrainingDocumentPage', () => ({
  default: () => <h1>Training Document Page</h1>,
}));

vi.mock('../../pages/QuizPage', () => ({
  default: () => <h1>Quiz Page</h1>,
}));

vi.mock('../../pages/ResultsPage', () => ({
  default: () => <h1>Quiz Results</h1>,
}));

vi.mock('../../pages/SetupPage', () => ({
  default: () => <h1>Complete Setup</h1>,
}));

vi.mock('../../pages/VerifyEmailPage', () => ({
  default: () => <h1>Verify Email</h1>,
}));

vi.mock('../../pages/ConfirmEmailChangePage', () => ({
  default: () => <h1>Confirm Email Change</h1>,
}));

vi.mock('../../pages/ResetPasswordPage', () => ({
  default: () => <h1>Reset Password</h1>,
}));

vi.mock('../../pages/ForgotPasswordPage', () => ({
  default: () => <h1>Forgot Password</h1>,
}));

vi.mock('../../pages/OrganisationSecuritySettingsPage', () => ({
  default: () => <h1>Organisation Security Settings</h1>,
}));

vi.mock('../../pages/OrganisationTraineesPage', () => ({
  default: () => <h1>Organisation Trainees</h1>,
}));

vi.mock('../../pages/OrganisationAdministratorsPage', () => ({
  default: () => <h1>Organisation Administrators</h1>,
}));

vi.mock('../../pages/PlatformOrganisationManagementPage', () => ({
  default: () => <h1>Platform Organisation Management</h1>,
}));

vi.mock('../../pages/PlatformAdministratorsPage', () => ({
  default: () => <h1>Platform Administrators</h1>,
}));

vi.mock('../../pages/CampaignAssignmentPage', () => ({
  default: () => <h1>Campaign Assignment</h1>,
}));

vi.mock('../../pages/AccountManagementPage', () => ({
  default: () => <h1>Account Management</h1>,
}));

vi.mock('../../pages/OrganisationRegistrationRequestPage', () => ({
  default: () => <h1>Organisation Registration Request</h1>,
}));

vi.mock('../../pages/AcceptInvitePage', () => ({
  default: () => <h1>Accept Invite</h1>,
}));

vi.mock('../../pages/BrandPage', () => ({
  default: () => <h1>Brand Page</h1>,
}));

vi.mock('../../lib/campaignsApi', () => ({
  getTraineeCampaigns: vi.fn(),
  getTraineeCampaignDetail: vi.fn(),
}));

vi.mock('../../features/campaign-management/apiCampaignManagementClient', async () => {
  const { developmentCampaignManagementClient } =
    await import('../../features/campaign-management/developmentCampaignManagementClient');

  return {
    apiCampaignManagementClient: developmentCampaignManagementClient,
  };
});

import AppRoutes from '../AppRoutes';
import { getTraineeCampaignDetail, getTraineeCampaigns } from '../../lib/campaignsApi';
import { AuthContext } from '../../context/auth-context';
import type { OrganisationPermissionKeyDto } from '@insightful-phish/shared';

const mockedGetTraineeCampaigns = vi.mocked(getTraineeCampaigns);
const mockedGetTraineeCampaignDetail = vi.mocked(getTraineeCampaignDetail);

const CAMPAIGN_ID = '11111111-1111-4111-8111-111111111111';
const TRAINING_CAMPAIGN_ITEM_ID = '33333333-3333-4333-8333-333333333333';
const QUIZ_CAMPAIGN_ITEM_ID = '33333333-3333-4333-8333-333333333334';
const ATTEMPT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function LocationDisplay() {
  const location = useLocation();

  return <div data-testid="location-path">{location.pathname}</div>;
}

type RenderAppRoutesOptions = {
  initialEntry: string;
  isAuthenticated?: boolean;
  role?: UserTypeDto;
  platformAdminRole?: 'SUPER_ADMIN' | 'NORMAL_ADMIN' | null;
  organisation?: { id: string; name: string; status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED' } | null;
  permissions?: string[];
  redirectTo?: string | null;
};

function renderAppRoutes({
  initialEntry,
  isAuthenticated = true,
  role = 'GENERAL_TRAINEE',
  platformAdminRole = null,
  organisation = null,
  permissions = [role],
  redirectTo,
}: RenderAppRoutesOptions) {
  const defaultRedirect =
    redirectTo ??
    (role === 'IP_ADMIN'
      ? '/platform-administrators'
      : role === 'ORGANISATION_ADMIN'
        ? organisation?.id
          ? '/organisation-information'
          : '/'
        : '/campaigns');

  return renderWithRouter(
    <>
      <LocationDisplay />
      <AppRoutes />
    </>,
    {
      initialEntry,
      auth: {
        isAuthenticated,
        token: isAuthenticated ? 'demo-token-za' : null,
        user: isAuthenticated
          ? {
              id: 'user-rudolph-za-1',
              firstName: 'Rudolph',
              lastName: 'van der Merwe',
              email: `${role.toLowerCase()}.rudolph@insightful-phish.co.za`,
              userType: role,
              authStatus: 'ACTIVE',
              traineeProfile: null,
              adminProfile: null,
              createdAt: '2026-01-01T00:00:00.000Z',
            }
          : null,
        authContext: isAuthenticated
          ? {
              user: {
                id: 'user-rudolph-za-1',
                userType: role,
                authStatus: 'ACTIVE',
              },
              role,
              organisation,
              platformAdminRole,
              permissions,
              redirectTo: defaultRedirect,
            }
          : null,
        permissions: isAuthenticated ? permissions : [],
        redirectTo: isAuthenticated ? defaultRedirect : null,
      },
    },
  );
}

function renderCampaignManagementRoutes(
  initialEntry: string,
  role: 'ORGANISATION_ADMIN' | 'IP_ADMIN',
  organisationId: string | null,
  permissions: OrganisationPermissionKeyDto[] = [],
) {
  const authValue = createAuthContextValue({
    user: {
      id: 'user-one',
      firstName: 'Campaign',
      lastName: 'Administrator',
      email: 'campaign-admin@example.com',
      userType: role,
      authStatus: 'ACTIVE',
      traineeProfile: null,
      adminProfile: null,
      createdAt: '2026-08-01T00:00:00.000Z',
    },
    authContext: {
      user: {
        id: 'Campaign-admin-user',
        userType: role,
        authStatus: 'ACTIVE',
      },
      role,
      organisation: organisationId
        ? {
            id: organisationId,
            name: 'Example Organisation',
            status: 'ACTIVE',
          }
        : null,
      platformAdminRole: role === 'IP_ADMIN' ? 'NORMAL_ADMIN' : null,
      permissions,
      redirectTo: role === 'IP_ADMIN' ? '/platform/campaigns' : 'organisation-information',
    },
    permissions,
    redirectTo: role === 'IP_ADMIN' ? '/platform/campaigns' : 'organisation-information',
  });

  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <>
            <LocationDisplay />
            <AppRoutes />
          </>
        ),
      },
    ],
    {
      initialEntries: [initialEntry],
    },
  );

  return render(
    <AuthContext.Provider value={authValue}>
      <RouterProvider router={router} />
    </AuthContext.Provider>,
  );
}

describe('AppRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedGetTraineeCampaigns.mockResolvedValue({
      campaigns: [
        {
          campaignId: CAMPAIGN_ID,
          name: 'Highveld Awareness Campaign',
          campaignType: 'PREMADE_GENERAL',
          difficultyLevel: 'BEGINNER',
          status: 'ACTIVE',
          progressStatus: 'IN_PROGRESS',
          eligibility: {
            canView: true,
            canProgress: true,
            reason: 'AVAILABLE',
          },
        },
      ],
    });

    mockedGetTraineeCampaignDetail.mockResolvedValue({
      campaignId: CAMPAIGN_ID,
      name: 'Highveld Awareness Campaign',
      campaignType: 'PREMADE_GENERAL',
      difficultyLevel: 'BEGINNER',
      status: 'ACTIVE',
      progressStatus: 'IN_PROGRESS',
      eligibility: {
        canView: true,
        canProgress: true,
        reason: 'AVAILABLE',
      },
      items: [],
    });

    vi.spyOn(organisationDetailsService, 'getPlatformOrganisationDetail').mockResolvedValue({
      id: 'org-gauteng-123',
      name: 'Protea Security Gauteng',
      status: 'ACTIVE',
      detailType: 'active organisation',
      description: 'Cybersecurity service provider in Gauteng',
      approximateSize: 100,
      website: 'https://proteasecurity.co.za',
      primaryDomain: 'proteasecurity.co.za',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      _count: { adminProfiles: 2, traineeProfiles: 45 },
      registrationRequest: null,
      setupStatus: null,
      resendEligibility: { isEligible: false, reason: null },
      admins: [],
      timeline: [],
    });

    vi.spyOn(organisationDetailsService, 'getPlatformOrganisationRequestDetails').mockResolvedValue(
      {
        id: 'req-durban-456',
        submittedOrganisationName: 'Cyber Jan Pending Request',
        submittedOrganisationDescription: 'Pending approval',
        submittedWebsite: 'https://cyberjan.co.za',
        submittedPrimaryDomain: 'cyberjan.co.za',
        submittedOrganisationSize: 20,
        status: 'PENDING',
        detailType: 'request-only',
        createdAt: '2026-06-19T00:00:00.000Z',
        updatedAt: '2026-06-19T00:00:00.000Z',
        representativeFirstName: 'Rudolph',
        representativeLastName: 'van der Merwe',
        representativeEmail: 'rudolph@springbokcyber.co.za',
        representativePhone: null,
        contactedByIpAdminId: null,
        approvedByIpAdminId: null,
        rejectedByIpAdminId: null,
        approvedOrganisationId: null,
        contactedAt: null,
        approvedAt: null,
        rejectedAt: null,
        rejectionReason: null,
        setupStatus: null,
        resendEligibility: { isEligible: false, reason: 'ORGANISATION_NOT_ONBOARDING' },
        timeline: [],
      },
    );
  });

  describe('Public routes', () => {
    it('renders the login screen at /login', async () => {
      renderAppRoutes({
        initialEntry: '/login',
        isAuthenticated: false,
      });

      expect(
        await screen.findByRole('heading', { level: 1, name: /welcome back/i }),
      ).toBeInTheDocument();
    });

    it('renders the register screen at /register', async () => {
      renderAppRoutes({
        initialEntry: '/register',
        isAuthenticated: false,
      });

      expect(
        await screen.findByRole('heading', { level: 1, name: /^Get Started$/i }),
      ).toBeInTheDocument();
    });

    it('renders the setup screen at /setup/token/:token', async () => {
      renderAppRoutes({
        initialEntry: '/setup/token/exampleSetupTokenValueWithAtLeast32Chars',
        isAuthenticated: false,
      });

      expect(
        await screen.findByRole('heading', { level: 1, name: /complete setup/i }),
      ).toBeInTheDocument();
    });

    it('renders the verify email screen at /verify-email', async () => {
      renderAppRoutes({
        initialEntry: '/verify-email?token=exampleVerificationTokenValueWithAtLeast32Chars',
        isAuthenticated: false,
      });

      expect(
        await screen.findByRole('heading', { level: 1, name: /verify email/i }),
      ).toBeInTheDocument();
    });

    it('renders the confirm email screen at /confirm-email-change', async () => {
      renderAppRoutes({
        initialEntry: '/confirm-email-change?token=exampleEmailChangeTokenValueWithAtLeast32Chars',
        isAuthenticated: false,
      });

      expect(
        await screen.findByRole('heading', { level: 1, name: /confirm email change/i }),
      ).toBeInTheDocument();
    });

    it('renders the reset password screen at /reset-password', async () => {
      renderAppRoutes({
        initialEntry: '/reset-password?token=exampleResetTokenValueWithAtLeast32Chars',
        isAuthenticated: false,
      });

      expect(
        await screen.findByRole('heading', { level: 1, name: /^reset password$/i }),
      ).toBeInTheDocument();
    });

    it('renders the forgot password screen at /forgot-password', async () => {
      renderAppRoutes({
        initialEntry: '/forgot-password',
        isAuthenticated: false,
      });

      expect(
        await screen.findByRole('heading', { level: 1, name: /forgot password/i }),
      ).toBeInTheDocument();
    });

    it('renders the organisation registration request screen at /organisation-registration-request', async () => {
      renderAppRoutes({
        initialEntry: '/organisation-registration-request',
        isAuthenticated: false,
      });

      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: /organisation registration request/i,
        }),
      ).toBeInTheDocument();
    });

    it('renders the accept invite screen at /accept-invite', async () => {
      renderAppRoutes({
        initialEntry: '/accept-invite',
        isAuthenticated: false,
      });

      expect(
        await screen.findByRole('heading', { level: 1, name: /accept invite/i }),
      ).toBeInTheDocument();
    });

    it('renders the brand page at /brand', async () => {
      renderAppRoutes({
        initialEntry: '/brand',
        isAuthenticated: false,
      });

      expect(
        await screen.findByRole('heading', { level: 1, name: /brand page/i }),
      ).toBeInTheDocument();
    });

    it('renders the status page at /status', async () => {
      renderAppRoutes({
        initialEntry: '/status',
        isAuthenticated: false,
      });

      expect(
        await screen.findByRole('heading', { level: 1, name: /status page/i }),
      ).toBeInTheDocument();
    });

    it('renders the landing page at /', async () => {
      renderAppRoutes({
        initialEntry: '/',
        isAuthenticated: false,
      });

      expect(await screen.findByText(/DON'T TAKE THE BAIT/i)).toBeInTheDocument();
    });

    it('redirects unknown routes to /', async () => {
      renderAppRoutes({
        initialEntry: '/not-a-real-route',
        isAuthenticated: false,
      });

      await waitFor(() => {
        expect(screen.getByTestId('location-path')).toHaveTextContent('/');
      });
      expect(await screen.findByText(/DON'T TAKE THE BAIT/i)).toBeInTheDocument();
    });
  });

  describe('Unauthenticated access to protected routes', () => {
    const protectedRoutes = [
      '/campaigns',
      `/trainee/campaign-items/${TRAINING_CAMPAIGN_ITEM_ID}/simulated-inbox`,
      `/trainee/campaign-items/${TRAINING_CAMPAIGN_ITEM_ID}/simulated-emails/email-1`,
      `/training/${TRAINING_CAMPAIGN_ITEM_ID}`,
      `/quizzes/${QUIZ_CAMPAIGN_ITEM_ID}`,
      `/quiz-attempts/${ATTEMPT_ID}/results`,
      '/organisation-information',
      '/organisation-security-preferences',
      '/organisation-trainees',
      '/organisation-administrators',
      '/organisations/org-1/campaign-assignments/new',
      '/platform-administrators',
      '/organisation-management',
      '/platform/organisations/org-1',
      '/platform/organisation-requests/req-1',
      '/account-management',
    ];

    it.each(protectedRoutes)('redirects unauthenticated users from %s to /', async (path) => {
      renderAppRoutes({
        initialEntry: path,
        isAuthenticated: false,
      });

      await waitFor(() => {
        expect(screen.getByTestId('location-path')).toHaveTextContent('/');
      });
    });
  });

  describe('GENERAL_TRAINEE role access', () => {
    const authorizedTraineeRoutes = [
      ['/campaigns', /^campaigns$/i],
      [
        `/trainee/campaign-items/${TRAINING_CAMPAIGN_ITEM_ID}/simulated-inbox`,
        /^simulated email inbox$/i,
      ],
      [
        `/trainee/campaign-items/${TRAINING_CAMPAIGN_ITEM_ID}/simulated-emails/email-123`,
        /^simulated email$/i,
      ],
      [`/training/${TRAINING_CAMPAIGN_ITEM_ID}`, /^training document page$/i],
      [`/quizzes/${QUIZ_CAMPAIGN_ITEM_ID}`, /^quiz page$/i],
      [`/quiz-attempts/${ATTEMPT_ID}/results`, /^quiz results$/i],
      ['/account-management', /^account management$/i],
    ] as const;

    it.each(authorizedTraineeRoutes)(
      'renders %s for GENERAL_TRAINEE',
      async (path, headingRegex) => {
        renderAppRoutes({
          initialEntry: path,
          role: 'GENERAL_TRAINEE',
        });

        expect(
          await screen.findByRole('heading', { level: 1, name: headingRegex }),
        ).toBeInTheDocument();
      },
    );

    const forbiddenRoutesForTrainee = [
      '/organisation-information',
      '/organisation-security-preferences',
      '/organisation-trainees',
      '/organisation-administrators',
      '/organisations/org-1/campaign-assignments/new',
      '/platform-administrators',
      '/organisation-management',
      '/platform/organisations/org-1',
      '/platform/organisation-requests/req-1',
    ];

    it.each(forbiddenRoutesForTrainee)(
      'redirects trainee away from forbidden route %s to /campaigns',
      async (path) => {
        renderAppRoutes({
          initialEntry: path,
          role: 'GENERAL_TRAINEE',
        });

        await waitFor(() => {
          expect(screen.getByTestId('location-path')).toHaveTextContent('/campaigns');
        });
      },
    );
  });

  describe('ORGANISATION_TRAINEE role access', () => {
    const authorizedOrgTraineeRoutes = [
      ['/campaigns', /^campaigns$/i],
      [`/training/${TRAINING_CAMPAIGN_ITEM_ID}`, /^training document page$/i],
      ['/account-management', /^account management$/i],
    ] as const;

    it.each(authorizedOrgTraineeRoutes)(
      'renders %s for ORGANISATION_TRAINEE',
      async (path, headingRegex) => {
        renderAppRoutes({
          initialEntry: path,
          role: 'ORGANISATION_TRAINEE',
          organisation: {
            id: 'org-stellenbosch-1',
            name: 'Springbok Cyber Technologies',
            status: 'ACTIVE',
          },
        });

        expect(
          await screen.findByRole('heading', { level: 1, name: headingRegex }),
        ).toBeInTheDocument();
      },
    );

    const forbiddenRoutesForOrgTrainee = [
      '/organisation-information',
      '/organisation-security-preferences',
      '/organisation-trainees',
      '/organisation-administrators',
      '/organisations/org-stellenbosch-1/campaign-assignments/new',
      '/platform-administrators',
      '/organisation-management',
      '/platform/organisations/org-stellenbosch-1',
      '/platform/organisation-requests/req-stellenbosch-1',
    ];

    it.each(forbiddenRoutesForOrgTrainee)(
      'redirects organisation trainee away from forbidden route %s to /campaigns',
      async (path) => {
        renderAppRoutes({
          initialEntry: path,
          role: 'ORGANISATION_TRAINEE',
          organisation: {
            id: 'org-stellenbosch-1',
            name: 'Springbok Cyber Technologies',
            status: 'ACTIVE',
          },
        });

        await waitFor(() => {
          expect(screen.getByTestId('location-path')).toHaveTextContent('/campaigns');
        });
      },
    );
  });

  describe('ORGANISATION_ADMIN role access', () => {
    const orgAdminContext = {
      role: 'ORGANISATION_ADMIN' as const,
      organisation: {
        id: 'org-gauteng-123',
        name: 'Protea Security Gauteng',
        status: 'ACTIVE' as const,
      },
      permissions: [
        'ORGANISATION_ADMIN',
        'VIEW_ORGANISATION_TRAINEES',
        'VIEW_ORGANISATION_ADMINS',
        'ASSIGN_CAMPAIGNS',
        'CHANGE_ORGANISATION_SECURITY_SETTINGS',
      ],
      redirectTo: '/organisation-information',
    };

    const authorizedOrgAdminRoutes = [
      ['/organisation-information', /^(organisation information|Protea Security Gauteng)$/i],
      ['/organisation-security-preferences', /^organisation security settings$/i],
      ['/organisation-trainees', /^organisation trainees$/i],
      ['/organisation-administrators', /^organisation administrators$/i],
      ['/organisations/org-gauteng-123/campaign-assignments/new', /^campaign assignment$/i],
      ['/account-management', /^account management$/i],
    ] as const;

    it.each(authorizedOrgAdminRoutes)(
      'renders %s for ORGANISATION_ADMIN with required permissions',
      async (path, headingRegex) => {
        renderAppRoutes({
          initialEntry: path,
          ...orgAdminContext,
        });

        expect(
          await screen.findByRole('heading', { level: 1, name: headingRegex }),
        ).toBeInTheDocument();
      },
    );

    it('ensures organisation admin visiting /organisation-information does not call platform detail or request services', async () => {
      const platformDetailSpy = vi.spyOn(
        organisationDetailsService,
        'getPlatformOrganisationDetail',
      );
      const platformRequestSpy = vi.spyOn(
        organisationDetailsService,
        'getPlatformOrganisationRequestDetails',
      );

      renderAppRoutes({
        initialEntry: '/organisation-information',
        ...orgAdminContext,
      });

      expect(
        await screen.findByRole('heading', { level: 1, name: /Protea Security Gauteng/i }),
      ).toBeInTheDocument();
      expect(platformDetailSpy).not.toHaveBeenCalled();
      expect(platformRequestSpy).not.toHaveBeenCalled();
    });

    const forbiddenRoutesForOrgAdmin = [
      '/campaigns',
      `/trainee/campaign-items/${TRAINING_CAMPAIGN_ITEM_ID}/simulated-inbox`,
      `/trainee/campaign-items/${TRAINING_CAMPAIGN_ITEM_ID}/simulated-emails/email-1`,
      `/training/${TRAINING_CAMPAIGN_ITEM_ID}`,
      `/quizzes/${QUIZ_CAMPAIGN_ITEM_ID}`,
      `/quiz-attempts/${ATTEMPT_ID}/results`,
      '/platform-administrators',
      '/organisation-management',
      '/platform/organisations/org-gauteng-123',
      '/platform/organisation-requests/req-durban-456',
    ];

    it.each(forbiddenRoutesForOrgAdmin)(
      'redirects organisation admin away from %s to /organisation-information',
      async (path) => {
        renderAppRoutes({
          initialEntry: path,
          ...orgAdminContext,
        });

        await waitFor(() => {
          expect(screen.getByTestId('location-path')).toHaveTextContent(
            '/organisation-information',
          );
        });
      },
    );

    const permissionRestrictedRoutes = [
      ['/organisation-trainees', 'VIEW_ORGANISATION_TRAINEES'],
      ['/organisation-administrators', 'VIEW_ORGANISATION_ADMINS'],
      ['/organisations/org-gauteng-123/campaign-assignments/new', 'ASSIGN_CAMPAIGNS'],
    ] as const;

    it.each(permissionRestrictedRoutes)(
      'redirects organisation admin lacking %s from %s to /organisation-information',
      async (path) => {
        renderAppRoutes({
          initialEntry: path,
          role: 'ORGANISATION_ADMIN',
          organisation: {
            id: 'org-gauteng-123',
            name: 'Protea Security Gauteng',
            status: 'ACTIVE',
          },
          permissions: ['ORGANISATION_ADMIN'],
          redirectTo: '/organisation-information',
        });

        await waitFor(() => {
          expect(screen.getByTestId('location-path')).toHaveTextContent(
            '/organisation-information',
          );
        });
      },
    );

    const orgContextRequiredRoutes = [
      '/organisation-information',
      '/organisation-security-preferences',
      '/organisation-trainees',
      '/organisation-administrators',
      '/organisations/org-gauteng-123/campaign-assignments/new',
    ];

    it.each(orgContextRequiredRoutes)(
      'redirects organisation admin without organisation context from %s to /',
      async (path) => {
        renderAppRoutes({
          initialEntry: path,
          role: 'ORGANISATION_ADMIN',
          organisation: null,
          redirectTo: '/organisation-information',
        });

        await waitFor(() => {
          expect(screen.getByTestId('location-path')).toHaveTextContent('/');
        });
      },
    );
  });

  describe('IP_ADMIN (Platform Administrator) role access', () => {
    const platformAdminContext = {
      role: 'IP_ADMIN' as const,
      platformAdminRole: 'SUPER_ADMIN' as const,
      permissions: ['PLATFORM_ADMIN'],
      redirectTo: '/platform-administrators',
    };

    const authorizedPlatformRoutes = [
      ['/platform-administrators', /^platform administrators$/i],
      ['/organisation-management', /^platform organisation management$/i],
      [
        '/platform/organisations/org-gauteng-123',
        /^(organisation information|Protea Security Gauteng)$/i,
      ],
      [
        '/platform/organisation-requests/req-durban-456',
        /^(organisation information|Cyber Jan Pending Request)$/i,
      ],
      ['/account-management', /^account management$/i],
    ] as const;

    it.each(authorizedPlatformRoutes)('renders %s for IP_ADMIN', async (path, headingRegex) => {
      renderAppRoutes({
        initialEntry: path,
        ...platformAdminContext,
      });

      expect(
        await screen.findByRole('heading', { level: 1, name: headingRegex }),
      ).toBeInTheDocument();
    });

    const forbiddenRoutesForPlatformAdmin = [
      '/campaigns',
      `/trainee/campaign-items/${TRAINING_CAMPAIGN_ITEM_ID}/simulated-inbox`,
      `/trainee/campaign-items/${TRAINING_CAMPAIGN_ITEM_ID}/simulated-emails/email-1`,
      `/training/${TRAINING_CAMPAIGN_ITEM_ID}`,
      `/quizzes/${QUIZ_CAMPAIGN_ITEM_ID}`,
      `/quiz-attempts/${ATTEMPT_ID}/results`,
      '/organisation-information',
      '/organisation-security-preferences',
      '/organisation-trainees',
      '/organisation-administrators',
      '/organisations/org-gauteng-123/campaign-assignments/new',
    ];

    it.each(forbiddenRoutesForPlatformAdmin)(
      'redirects platform admin away from %s to /platform-administrators',
      async (path) => {
        renderAppRoutes({
          initialEntry: path,
          ...platformAdminContext,
        });

        await waitFor(() => {
          expect(screen.getByTestId('location-path')).toHaveTextContent('/platform-administrators');
        });
      },
    );
  });

  describe('Direct navigation and stale bookmarks', () => {
    it('redirects an organisation admin arriving at a stale bookmarked /campaigns URL to /organisation-information', async () => {
      renderAppRoutes({
        initialEntry: '/campaigns',
        role: 'ORGANISATION_ADMIN',
        organisation: {
          id: 'org-gauteng-123',
          name: 'Protea Security Gauteng',
          status: 'ACTIVE',
        },
        permissions: ['ORGANISATION_ADMIN'],
        redirectTo: '/organisation-information',
      });

      await waitFor(() => {
        expect(screen.getByTestId('location-path')).toHaveTextContent('/organisation-information');
      });
      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: /^(organisation information|Protea Security Gauteng)$/i,
        }),
      ).toBeInTheDocument();
    });

    it('redirects a platform admin arriving at a stale bookmarked /organisation-trainees URL to /platform-administrators', async () => {
      renderAppRoutes({
        initialEntry: '/organisation-trainees',
        role: 'IP_ADMIN',
        platformAdminRole: 'SUPER_ADMIN',
        permissions: ['PLATFORM_ADMIN'],
        redirectTo: '/platform-administrators',
      });

      await waitFor(() => {
        expect(screen.getByTestId('location-path')).toHaveTextContent('/platform-administrators');
      });
      expect(
        await screen.findByRole('heading', { level: 1, name: /platform administrators/i }),
      ).toBeInTheDocument();
    });

    it('redirects an authenticated trainee visiting /login directly to /campaigns', async () => {
      renderAppRoutes({
        initialEntry: '/login',
        role: 'GENERAL_TRAINEE',
      });

      await waitFor(() => {
        expect(screen.getByTestId('location-path')).toHaveTextContent('/campaigns');
      });
    });

    it('redirects an authenticated organisation admin visiting /login directly to /organisation-information', async () => {
      renderAppRoutes({
        initialEntry: '/login',
        role: 'ORGANISATION_ADMIN',
        organisation: {
          id: 'org-gauteng-123',
          name: 'Protea Security Gauteng',
          status: 'ACTIVE',
        },
        permissions: ['ORGANISATION_ADMIN'],
        redirectTo: '/organisation-information',
      });

      await waitFor(() => {
        expect(screen.getByTestId('location-path')).toHaveTextContent('/organisation-information');
      });
    });

    it('redirects an authenticated platform admin visiting /login directly to /platform-administrators', async () => {
      renderAppRoutes({
        initialEntry: '/login',
        role: 'IP_ADMIN',
        platformAdminRole: 'SUPER_ADMIN',
        permissions: ['PLATFORM_ADMIN'],
        redirectTo: '/platform-administrators',
      });

      await waitFor(() => {
        expect(screen.getByTestId('location-path')).toHaveTextContent('/platform-administrators');
      });
    });
  });

  describe('Campaign activity navigation', () => {
    it('navigates from a campaign training item to the mounted frontend training route, not the backend activity path', async () => {
      const user = userEvent.setup();
      const backendTrainingApiPath = `/trainee/campaign-items/${TRAINING_CAMPAIGN_ITEM_ID}/training-document`;
      const frontendTrainingPath = `/training/${TRAINING_CAMPAIGN_ITEM_ID}`;

      mockedGetTraineeCampaignDetail.mockResolvedValueOnce({
        campaignId: CAMPAIGN_ID,
        name: 'Highveld Awareness Campaign',
        campaignType: 'PREMADE_GENERAL',
        difficultyLevel: 'BEGINNER',
        status: 'ACTIVE',
        progressStatus: 'IN_PROGRESS',
        eligibility: {
          canView: true,
          canProgress: true,
          reason: 'AVAILABLE',
        },
        items: [
          {
            campaignItemId: TRAINING_CAMPAIGN_ITEM_ID,
            campaignId: CAMPAIGN_ID,
            itemType: 'COMPONENT',
            title: 'Read SARS and banking warning signs',
            position: 0,
            isRequired: true,
            availabilityStatus: 'AVAILABLE',
            isOpenable: true,
            progressStatus: 'NOT_STARTED',
            componentType: 'TRAINING_DOCUMENT',
            activityApiPath: backendTrainingApiPath,
            eligibility: {
              canView: true,
              canProgress: true,
              reason: 'AVAILABLE',
            },
            trainingDocument: {
              id: '44444444-4444-4444-8444-444444444441',
              title: 'SARS & Banking warning signs',
              contentSummary: 'Learn how to spot suspicious SARS refund notices and fake EFTs.',
              estimatedReadTimeMinutes: 4,
              difficultyLevel: 'BEGINNER',
              status: 'AVAILABLE',
            },
          },
        ],
      });

      renderAppRoutes({
        initialEntry: '/campaigns',
      });

      await user.click(
        await screen.findByRole('button', {
          name: /highveld awareness campaign/i,
        }),
      );

      await user.click(
        await screen.findByRole('button', {
          name: /learn: "read sars and banking warning signs"/i,
        }),
      );

      await waitFor(() => {
        expect(screen.getByTestId('location-path')).toHaveTextContent(frontendTrainingPath);
      });

      expect(screen.getByTestId('location-path')).not.toHaveTextContent(backendTrainingApiPath);
      expect(
        await screen.findByRole('heading', { level: 1, name: /training document page/i }),
      ).toBeInTheDocument();
    });
  });

  it('renders the shared organisation Campaign list with organisation copy', async () => {
    const organisationId = '11111111-1111-4111-8111-111111111111';

    renderCampaignManagementRoutes(
      `/organisations/${organisationId}/campaigns`,
      'ORGANISATION_ADMIN',
      organisationId,
      ['VIEW_CAMPAIGNS'],
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: /^Campaigns$/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Create and manage campaigns for your organisation.'),
    ).toBeInTheDocument();
  });

  it('renders the shared platform Campaign list with platform copy', async () => {
    renderCampaignManagementRoutes('/platform/campaigns', 'IP_ADMIN', null);

    expect(
      await screen.findByRole('heading', { level: 1, name: /^Platform Campaigns$/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Create and manage campaigns available through Insightful Phish.'),
    ).toBeInTheDocument();
  });

  it('renders the organisation Create Campaign shell', async () => {
    const organisationId = '11111111-1111-4111-8111-111111111111';

    renderCampaignManagementRoutes(
      `/organisations/${organisationId}/campaigns/new`,
      'ORGANISATION_ADMIN',
      organisationId,
      ['MANAGE_CAMPAIGNS'],
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: /^Create Campaign$/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Build a campaign by selecting and organising campaign items.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Campaigns' })).toHaveAttribute(
      'href',
      `/organisations/${organisationId}/campaigns`,
    );
  });

  it('renders the platform Create Campaign shell', async () => {
    renderCampaignManagementRoutes('/platform/campaigns/new', 'IP_ADMIN', null);

    expect(
      await screen.findByRole('heading', { level: 1, name: /^Create Campaign$/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Campaigns' })).toHaveAttribute(
      'href',
      '/platform/campaigns',
    );
  });

  it('renders authoritative organisation Campaign detail', async () => {
    const organisationId = '11111111-1111-4111-8111-111111111111';
    const campaignId = '10000000-0000-4000-8000-000000000001';

    renderCampaignManagementRoutes(
      `/organisations/${organisationId}/campaigns/${campaignId}`,
      'ORGANISATION_ADMIN',
      organisationId,
      ['VIEW_CAMPAIGNS'],
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Draft Campaign' }),
    ).toBeInTheDocument();

    const detail = screen.getByRole('region', { name: 'New starter security' });
    expect(within(detail).getByText('Draft')).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Campaign details' })).not.toBeInTheDocument();
  });

  it('allows an organisation Campaign list user with MANAGE_CAMPAIGNS', async () => {
    const organisationId = '11111111-1111-4111-8111-111111111111';

    renderCampaignManagementRoutes(
      `/organisations/${organisationId}/campaigns`,
      'ORGANISATION_ADMIN',
      organisationId,
      ['MANAGE_CAMPAIGNS'],
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: /^Campaigns$/ }),
    ).toBeInTheDocument();
  });

  it('denies organisation Campaign list access without a Campaign permission', async () => {
    const organisationId = '11111111-1111-4111-8111-111111111111';

    renderCampaignManagementRoutes(
      `/organisations/${organisationId}/campaigns`,
      'ORGANISATION_ADMIN',
      organisationId,
    );

    await waitFor(() => {
      expect(screen.getByTestId('location-path')).toHaveTextContent('/');
    });
  });

  it('requires MANAGE_CAMPAIGNS for the organisation Create Campaign route', async () => {
    const organisationId = '11111111-1111-4111-8111-111111111111';

    renderCampaignManagementRoutes(
      `/organisations/${organisationId}/campaigns/new`,
      'ORGANISATION_ADMIN',
      organisationId,
      ['VIEW_CAMPAIGNS'],
    );

    await waitFor(() => {
      expect(screen.getByTestId('location-path')).toHaveTextContent('/');
    });

    expect(
      screen.queryByRole('heading', { level: 1, name: /^Create Campaign$/ }),
    ).not.toBeInTheDocument();
  });
});
