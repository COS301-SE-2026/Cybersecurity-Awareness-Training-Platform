import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import OrganisationSecuritySettingsPage from '../OrganisationSecuritySettingsPage';
import { AuthContext } from '../../context/auth-context';
import { createAuthContextValue } from '../../testing/render';
import {
  getOrganisationSecuritySettings,
  updateOrganisationSecuritySettings,
} from '../../services/organisation-security-settings.service';
import { ApiError } from '../../lib/apiClient';
import type { OrganisationSecuritySettingsResponseDto } from '@insightful-phish/shared';

vi.mock('../../services/organisation-security-settings.service', () => ({
  getOrganisationSecuritySettings: vi.fn(),
  updateOrganisationSecuritySettings: vi.fn(),
}));
const mockGetSettings = vi.mocked(getOrganisationSecuritySettings);
const mockUpdateSettings = vi.mocked(updateOrganisationSecuritySettings);

const mockOrgId = '11111111-1111-4111-8111-111111111111';

function buildMockResponse(
  overrides?: Partial<OrganisationSecuritySettingsResponseDto>,
): OrganisationSecuritySettingsResponseDto {
  return {
    organisationId: mockOrgId,
    settings: {
      id: '22222222-2222-4222-8222-222222222222',
      organisationId: mockOrgId,
      enforceRememberMePolicy: true,
      allowRememberMe: true,
      maxRememberedSessionHours: 168,
      enforceRegularSessionLength: true,
      regularSessionLengthHours: 8,
      enforceIdleTimeout: true,
      idleTimeoutMinutes: 30,
      requireReauthenticationForSensitiveActions: true,
      allowTraineeEmailChange: false,
      updatedByOrganisationAdminId: null,
      createdAt: '2026-07-01T08:00:00.000Z',
      updatedAt: '2026-07-02T08:00:00.000Z',
    },
    effectivePolicy: {
      organisationId: mockOrgId,
      rememberMeRequested: false,
      rememberMeAllowed: true,
      rememberMeApplied: false,
      regularSessionSeconds: 28800,
      rememberedSessionSeconds: 604800,
      effectiveSessionSeconds: 28800,
      idleTimeoutMinutes: 30,
      requireReauthenticationForSensitiveActions: true,
      allowEmailChange: false,
    },
    platformLimits: {
      rememberMe: {
        maxRememberedSessionHours: {
          min: 1,
          max: 720,
          default: 168,
          options: [24, 72, 168, 336, 720],
        },
      },
      regularSession: {
        regularSessionLengthHours: {
          min: 1,
          max: 24,
          default: 8,
          options: [4, 8, 12, 24],
        },
      },
      idleTimeout: {
        idleTimeoutMinutes: {
          min: 5,
          max: 480,
          default: 30,
          options: [15, 30, 60, 120, 240, 480],
        },
      },
    },
    capabilities: {
      canView: true,
      canEdit: true,
      readOnlyReason: null,
      changesApply: {
        rememberMePolicy: 'NEXT_REFRESH_OR_LOGIN',
        regularSessionLength: 'NEXT_REFRESH_OR_LOGIN',
        idleTimeout: 'NEXT_REFRESH',
        requireReauthenticationForSensitiveActions: 'IMMEDIATE_FOR_NEW_ACTIONS',
        allowTraineeEmailChange: 'IMMEDIATE_FOR_NEW_REQUESTS',
      },
    },
    ...overrides,
  };
}

function renderComponent(permissions = ['ORGANISATION_ADMIN'], hasOrg = true, hasToken = true) {
  const authValue = createAuthContextValue({
    permissions,
    token: hasToken ? 'test-token' : null,
    authContext: hasOrg
      ? {
          user: {
            id: 'test-user-id',
            userType: 'ORGANISATION_ADMIN',
            authStatus: 'ACTIVE',
          },
          role: 'ORGANISATION_ADMIN',
          organisation: {
            id: mockOrgId,
            name: 'Test Org',
            status: 'ACTIVE',
          },
          platformAdminRole: null,
          permissions,
          redirectTo: '/organisation-security-preferences',
        }
      : null,
  });

  return render(
    <MemoryRouter>
      <AuthContext.Provider value={authValue}>
        <OrganisationSecuritySettingsPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe('OrganisationSecuritySettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially and populates fields when data resolves', async () => {
    mockGetSettings.mockResolvedValueOnce(buildMockResponse());

    renderComponent();

    expect(screen.getByText(/Loading organisation security settings/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Organisation Security Preferences/i }),
      ).toBeInTheDocument();
    });

    expect(mockGetSettings).toHaveBeenCalledWith(mockOrgId, 'test-token');

    const enforceRememberMe = screen.getByLabelText(
      /Enforce "Remember Me" Policy/i,
    ) as HTMLInputElement;
    const allowRememberMe = screen.getByLabelText(/Allow "Remember Me"/i) as HTMLInputElement;

    expect(enforceRememberMe.checked).toBe(true);
    expect(allowRememberMe.checked).toBe(true);
    expect(screen.getByText('7 Days (168 hours)')).toBeInTheDocument();
  });

  it('does nothing when token or organisationId is missing', async () => {
    renderComponent(['ORGANISATION_ADMIN'], false, false);
    expect(mockGetSettings).not.toHaveBeenCalled();
  });

  it('handles dependency toggles for remember me, regular session, and idle timeout', async () => {
    mockGetSettings.mockResolvedValueOnce(buildMockResponse());

    renderComponent();

    await waitFor(() => {
      expect(screen.getByLabelText(/Enforce "Remember Me" Policy/i)).toBeInTheDocument();
    });

    const enforceRememberMe = screen.getByLabelText(
      /Enforce "Remember Me" Policy/i,
    ) as HTMLInputElement;
    const allowRememberMe = screen.getByLabelText(/Allow "Remember Me"/i) as HTMLInputElement;

    // uncheck enforce remember me
    fireEvent.click(enforceRememberMe);
    expect(allowRememberMe.disabled).toBe(true);
    expect(allowRememberMe.checked).toBe(false);

    // Re-check enforce remember me
    fireEvent.click(enforceRememberMe);
    expect(allowRememberMe.disabled).toBe(false);
    expect(allowRememberMe.checked).toBe(false);

    // Check allow reember me
    fireEvent.click(allowRememberMe);

    // Test Enforce Regular Session toggle
    const enforceRegular = screen.getByLabelText(
      /Enforce Regular Session Length/i,
    ) as HTMLInputElement;
    fireEvent.click(enforceRegular);
    fireEvent.click(enforceRegular);

    // Test Enforce Idle Timeout toggle
    const enforceIdle = screen.getByLabelText(/Enforce Idle Timeout/i) as HTMLInputElement;
    fireEvent.click(enforceIdle);
    fireEvent.click(enforceIdle);
  });

  it('allows changing dropdown selections and checkbox toggles', async () => {
    mockGetSettings.mockResolvedValueOnce(buildMockResponse());

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('7 Days (168 hours)')).toBeInTheDocument();
    });

    // Change Remember Me Duration dropdown
    fireEvent.click(screen.getByText('7 Days (168 hours)'));
    fireEvent.click(screen.getByText('30 Days (720 hours)'));

    // Change Regular Session Duration dropdown
    fireEvent.click(screen.getByText('8 Hours'));
    fireEvent.click(screen.getByText('4 Hours'));

    // change Idle Timeout dropdown
    fireEvent.click(screen.getByText('30 Minutes'));
    fireEvent.click(screen.getByText('60 Minutes (1 Hour)'));
    const traineeCheckbox = screen.getByLabelText(
      /Allow Trainees to Change Email Address/i,
    ) as HTMLInputElement;
    fireEvent.click(traineeCheckbox);
    expect(traineeCheckbox.checked).toBe(true);

    const reLoginCheckbox = screen.getByLabelText(
      /Require Re-Login for Sensitive Actions/i,
    ) as HTMLInputElement;
    fireEvent.click(reLoginCheckbox);
    expect(reLoginCheckbox.checked).toBe(false);
  });

  it('resets form state when Reset Changes button is clicked', async () => {
    mockGetSettings.mockResolvedValueOnce(buildMockResponse());

    renderComponent();

    await waitFor(() => {
      expect(screen.getByLabelText(/Enforce "Remember Me" Policy/i)).toBeInTheDocument();
    });

    const enforceRememberMe = screen.getByLabelText(/Enforce "Remember Me" Policy/i);
    fireEvent.click(enforceRememberMe);

    const resetButton = screen.getByRole('button', { name: /Reset Changes/i });
    fireEvent.click(resetButton);

    expect(
      (screen.getByLabelText(/Enforce "Remember Me" Policy/i) as HTMLInputElement).checked,
    ).toBe(true);
  });

  it('submits updated settings successfully and updates UI state', async () => {
    const mockData = buildMockResponse();
    mockGetSettings.mockResolvedValueOnce(mockData);
    mockUpdateSettings.mockResolvedValueOnce(mockData);
    renderComponent();
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Update Organisation Security Preferences/i }),
      ).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', {
      name: /Update Organisation Security Preferences/i,
    });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith(
        mockOrgId,
        {
          enforceRememberMePolicy: true,
          allowRememberMe: true,
          maxRememberedSessionHours: 168,
          enforceRegularSessionLength: true,
          regularSessionLengthHours: 8,
          enforceIdleTimeout: true,
          idleTimeoutMinutes: 30,
          requireReauthenticationForSensitiveActions: true,
          allowTraineeEmailChange: false,
        },
        'test-token',
      );
    });

    expect(
      screen.getByText(/Organisation security preferences updated successfully/i),
    ).toBeInTheDocument();
  });
  it('renders read-only mode when server capabilities specifies readOnlyReason MISSING_PERMISSION', async () => {
    const response = buildMockResponse({
      capabilities: {
        canView: true,
        canEdit: false,
        readOnlyReason: 'MISSING_PERMISSION',
        changesApply: {
          rememberMePolicy: 'NEXT_REFRESH_OR_LOGIN',
          regularSessionLength: 'NEXT_REFRESH_OR_LOGIN',
          idleTimeout: 'NEXT_REFRESH',
          requireReauthenticationForSensitiveActions: 'IMMEDIATE_FOR_NEW_ACTIONS',
          allowTraineeEmailChange: 'IMMEDIATE_FOR_NEW_REQUESTS',
        },
      },
    });
    mockGetSettings.mockResolvedValueOnce(response);

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText(
          /You do not have the required permission to edit organisation security settings/i,
        ),
      ).toBeInTheDocument();
    });

    expect(
      (screen.getByLabelText(/Enforce "Remember Me" Policy/i) as HTMLInputElement).disabled,
    ).toBe(true);
    expect(
      (
        screen.getByRole('button', {
          name: /Update Organisation Security Preferences/i,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it('renders read-only mode when organisation is disabled or suspended', async () => {
    const responseSuspended = buildMockResponse({
      capabilities: {
        canView: true,
        canEdit: false,
        readOnlyReason: 'ORGANISATION_SUSPENDED',
        changesApply: {
          rememberMePolicy: 'NEXT_REFRESH_OR_LOGIN',
          regularSessionLength: 'NEXT_REFRESH_OR_LOGIN',
          idleTimeout: 'NEXT_REFRESH',
          requireReauthenticationForSensitiveActions: 'IMMEDIATE_FOR_NEW_ACTIONS',
          allowTraineeEmailChange: 'IMMEDIATE_FOR_NEW_REQUESTS',
        },
      },
    });
    mockGetSettings.mockResolvedValueOnce(responseSuspended);

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText(
          /Security settings cannot be modified because the organisation is currently suspended/i,
        ),
      ).toBeInTheDocument();
    });
  });

  it('renders read-only mode when organisation is disabled or reason is unknown', async () => {
    const responseDisabled = buildMockResponse({
      capabilities: {
        canView: true,
        canEdit: false,
        readOnlyReason: 'ORGANISATION_DISABLED',
        changesApply: {
          rememberMePolicy: 'NEXT_REFRESH_OR_LOGIN',
          regularSessionLength: 'NEXT_REFRESH_OR_LOGIN',
          idleTimeout: 'NEXT_REFRESH',
          requireReauthenticationForSensitiveActions: 'IMMEDIATE_FOR_NEW_ACTIONS',
          allowTraineeEmailChange: 'IMMEDIATE_FOR_NEW_REQUESTS',
        },
      },
    });
    mockGetSettings.mockResolvedValueOnce(responseDisabled);

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText(
          /Security settings cannot be modified because the organisation is inactive or disabled/i,
        ),
      ).toBeInTheDocument();
    });
  });

  it('handles load errors (401, 403, 404, 429, general)', async () => {
    mockGetSettings.mockRejectedValueOnce(
      new ApiError('Unauthorized', {
        status: 401,
        statusText: 'Unauthorized',
        method: 'GET',
        url: `/organisations/${mockOrgId}/security-settings`,
      }),
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Session expired or unauthorized/i)).toBeInTheDocument();
    });
  });

  it('handles save error status codes (401, 403, 404, 409, 422 with details, 429, general)', async () => {
    mockGetSettings.mockResolvedValueOnce(buildMockResponse());
    mockUpdateSettings.mockRejectedValueOnce(
      new ApiError('Unprocessable Entity', {
        status: 422,
        statusText: 'Unprocessable Entity',
        method: 'PATCH',
        url: `/organisations/${mockOrgId}/security-settings`,
        body: {
          message: 'Validation failed',
          details: [{ field: 'maxRememberedSessionHours', message: 'Must be a valid number' }],
        },
      }),
    );

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Update Organisation Security Preferences/i }),
      ).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole('button', { name: /Update Organisation Security Preferences/i }),
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByText(/Validation failed/i)).toBeInTheDocument();
    expect(screen.getByText(/Must be a valid number/i)).toBeInTheDocument();
  });
});
