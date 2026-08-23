import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import OrganisationInformationPage from '../OrganisationInformationPage';
import * as service from '../../services/organisation-details.service';

// unit and integration tests for organisation information page with South Africa context

let mockAuthContext: Record<string, unknown> = {
  role: 'IP_ADMIN',
  organisation: { id: 'org-123-abc', name: 'Cyber Jan Technologies', status: 'ACTIVE' },
};

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({
    token: 'mock-token-xyz',
    authContext: mockAuthContext,
    user: { userType: mockAuthContext?.role ?? 'IP_ADMIN' },
  }),
}));

// Mock AppLayout
vi.mock('../../components/layout/AppLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

function renderWithRouter(initialRoute = '/platform/organisations/org-123-abc') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route
          path="/platform/organisations/:organisationId"
          element={<OrganisationInformationPage />}
        />
        <Route
          path="/platform/organisation-requests/:requestId"
          element={<OrganisationInformationPage />}
        />
        <Route path="/organisation-information" element={<OrganisationInformationPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('OrganisationInformationPage Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthContext = {
      role: 'IP_ADMIN',
      organisation: { id: 'org-123-abc', name: 'Cyber Jan Technologies', status: 'ACTIVE' },
    };
  });

  it('renders loading state initially and then fetches org detail data', async () => {
    vi.spyOn(service, 'getPlatformOrganisationDetail').mockResolvedValue({
      id: 'org-123-abc',
      name: 'Cyber Jan Technologies',
      status: 'ACTIVE',
      detailType: 'active organisation',
      description: 'South African cybersecurity consultancy',
      approximateSize: 500,
      website: 'https://cyberjan.co.za',
      primaryDomain: 'cyberjan.co.za',
      createdAt: '2026-06-19T00:00:00.000Z',
      updatedAt: '2026-06-20T00:00:00.000Z',
      _count: { adminProfiles: 2, traineeProfiles: 150 },
      registrationRequest: {
        id: 'req-456',
        representativeFirstName: 'Jan',
        representativeLastName: 'van der Merwe',
        representativeEmail: 'jan@cyberjan.co.za',
        submittedWebsite: 'https://cyberjan.co.za',
        submittedPrimaryDomain: 'cyberjan.co.za',
      },
      setupStatus: {
        id: 'setup-1',
        status: 'COMPLETED',
        recipientEmail: 'jan@cyberjan.co.za',
        expiresAt: '2026-12-31T00:00:00.000Z',
        latestActionToken: null,
        latestEmailDelivery: null,
      },
      resendEligibility: { isEligible: false, reason: 'SETUP_ALREADY_COMPLETED' },
      admins: [],
      timeline: [],
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Cyber Jan Technologies/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/Status: ACTIVE/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Basic Information/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Representative Information/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Administrators/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Timeline/i })).toBeInTheDocument();
  });

  it('gates organisation-only sections for request-only pending records', async () => {
    vi.spyOn(service, 'getPlatformOrganisationRequestDetails').mockResolvedValue({
      id: 'req-789',
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
      representativeLastName: 'Lamprecht',
      representativeEmail: 'zaza@cyberjan.co.za',
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
    });

    renderWithRouter('/platform/organisation-requests/req-789');

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Cyber Jan Pending Request/i }),
      ).toBeInTheDocument();
    });

    // Request submission date label check and absence of Registered Trainees
    expect(screen.getByText(/Request Submission Date/i)).toBeInTheDocument();
    expect(screen.queryByText(/Registered Trainees/i)).not.toBeInTheDocument();

    // Administrators tab button and Danger Zone must NOT be rendered for request-only records
    expect(screen.queryByRole('button', { name: /Administrators/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Danger Zone/i)).not.toBeInTheDocument();
  });

  it('renders suspended warning banner for suspended organisations', async () => {
    vi.spyOn(service, 'getPlatformOrganisationDetail').mockResolvedValue({
      id: 'org-suspended-1',
      name: 'Suspended Org',
      status: 'SUSPENDED',
      detailType: 'active organisation',
      description: 'Suspended org',
      approximateSize: 10,
      website: 'https://cyberjan.co.za',
      primaryDomain: 'cyberjan.co.za',
      createdAt: '2026-06-19T00:00:00.000Z',
      updatedAt: '2026-06-20T00:00:00.000Z',
      _count: { adminProfiles: 1, traineeProfiles: 5 },
      registrationRequest: null,
      setupStatus: null,
      resendEligibility: { isEligible: false, reason: 'INVITATION_NOT_ELIGIBLE' },
      admins: [],
      timeline: [],
    });

    renderWithRouter('/platform/organisations/org-suspended-1');

    await waitFor(() => {
      expect(screen.getByText(/This organisation is currently SUSPENDED/i)).toBeInTheDocument();
    });
  });

  it('renders access denied message when backend returns 403 forbidden', async () => {
    const error = { status: 403, message: 'Access Denied' };
    vi.spyOn(service, 'getPlatformOrganisationDetail').mockRejectedValue(error);

    renderWithRouter();

    await waitFor(() => {
      expect(
        screen.getByText(
          /Access Denied. You do not have permission to view organisation details./i,
        ),
      ).toBeInTheDocument();
    });
  });

  it('renders 404 not found message when organisation is not found', async () => {
    const error = { status: 404, message: 'Not Found' };
    vi.spyOn(service, 'getPlatformOrganisationDetail').mockRejectedValue(error);
    vi.spyOn(service, 'getPlatformOrganisationRequestDetails').mockRejectedValue(error);

    renderWithRouter();

    await waitFor(() => {
      expect(
        screen.getByText(/Organisation or registration request details not found./i),
      ).toBeInTheDocument();
    });
  });

  it('switches navigation tabs when clicked', async () => {
    vi.spyOn(service, 'getPlatformOrganisationDetail').mockResolvedValue({
      id: 'org-123-abc',
      name: 'Cyber Jan Technologies',
      status: 'ACTIVE',
      detailType: 'active organisation',
      description: 'South African cybersecurity consultancy',
      approximateSize: 500,
      website: 'https://cyberjan.co.za',
      primaryDomain: 'cyberjan.co.za',
      createdAt: '2026-06-19T00:00:00.000Z',
      updatedAt: '2026-06-20T00:00:00.000Z',
      _count: { adminProfiles: 2, traineeProfiles: 150 },
      registrationRequest: null,
      setupStatus: null,
      resendEligibility: { isEligible: true, reason: null },
      admins: [],
      timeline: [],
    });

    const user = userEvent.setup();
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Cyber Jan Technologies/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Representative Information/i }));
    expect(
      screen.getByRole('heading', { name: /Organisation Representative Information/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Administrators/i }));
    expect(
      screen.getByRole('heading', { name: /Organisation Administrators/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Timeline/i }));
    expect(
      screen.getByRole('heading', { name: /Organisation Event Timeline/i }),
    ).toBeInTheDocument();
  });

  it('renders organisation information for ORGANISATION_ADMIN without calling platform APIs or rendering platform tabs', async () => {
    const platformDetailSpy = vi.spyOn(service, 'getPlatformOrganisationDetail');
    const platformRequestSpy = vi.spyOn(service, 'getPlatformOrganisationRequestDetails');

    mockAuthContext = {
      role: 'ORGANISATION_ADMIN',
      organisation: {
        id: 'org-123-abc',
        name: 'Protea Security Gauteng',
        status: 'ACTIVE',
      },
    };

    renderWithRouter('/organisation-information');

    expect(
      await screen.findByRole('heading', { name: /Protea Security Gauteng/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Status: ACTIVE/i)).toBeInTheDocument();
    expect(platformDetailSpy).not.toHaveBeenCalled();
    expect(platformRequestSpy).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('button', { name: /Representative Information/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Administrators/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Timeline/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Danger Zone/i)).not.toBeInTheDocument();
  });
});
