import '@testing-library/jest-dom/vitest';
import OrganisationRegistrationRequestPage from '../OrganisationRegistrationRequestPage';

import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../../lib/apiClient';

const { submitOrganisationRegistrationRequestMock } = vi.hoisted(() => ({
  submitOrganisationRegistrationRequestMock: vi.fn(),
}));

vi.mock('../../services/organisation-registration-request.service', () => ({
  submitOrganisationRegistrationRequest: submitOrganisationRegistrationRequestMock,
}));

function renderOrganisationRegistrationRequestPage() {
  return render(
    <MemoryRouter>
      <OrganisationRegistrationRequestPage />
    </MemoryRouter>,
  );
}

function createOrganisationRequestApiError(
  status: number,
  errorCode: string,
  body: unknown = {
    error: errorCode,
    message: errorCode,
  },
) {
  return new ApiError(errorCode, {
    status,
    statusText: 'Error',
    method: 'POST',
    url: 'http://localhost:4000/organisation-registration-requests',
    body,
  });
}

async function fillOrganisationStep(
  user: ReturnType<typeof userEvent.setup>,
  values: {
    organisationName?: string;
    organisationSize?: string;
    organisationDescription?: string;
    organisationWebsiteUrl?: string;
  } = {},
) {
  await user.type(
    screen.getByLabelText(/Organisation Name/i),
    values.organisationName ?? ' CBELL Plumbing',
  );
  await user.type(screen.getByLabelText(/Organisation Size/i), values.organisationSize ?? '25');

  if (values.organisationDescription !== undefined) {
    await user.type(
      screen.getByLabelText(/Organisation Description/i),
      values.organisationDescription,
    );
  }

  if (values.organisationWebsiteUrl !== undefined) {
    await user.type(screen.getByLabelText(/Organisation URL/i), values.organisationWebsiteUrl);
  }

  await user.click(screen.getByRole('button', { name: /Next/i }));
}

async function fillRepresentativeStep(
  user: ReturnType<typeof userEvent.setup>,
  values: {
    representativeFirstName?: string;
    representativeLastName?: string;
    representativeEmail?: string;
  } = {},
) {
  await user.type(
    screen.getByLabelText(/Representative First Name\(s\)/i),
    values.representativeFirstName ?? ' Casey ',
  );
  await user.type(
    screen.getByLabelText(/Representative Last Name/i),
    values.representativeLastName ?? ' Bell ',
  );
  await user.type(
    screen.getByLabelText(/Representative Email Address/i),
    values.representativeEmail ?? ' CASEY@example.com',
  );
}

async function submitValidOrganisationRequest(
  user: ReturnType<typeof userEvent.setup>,
  values: Parameters<typeof fillOrganisationStep>[1] &
    Parameters<typeof fillRepresentativeStep>[1] = {},
) {
  await fillOrganisationStep(user, values);
  await fillRepresentativeStep(user, values);
  await user.click(screen.getByRole('button', { name: /Complete Registration Request/i }));
}

describe('OrganisationRegistrationRequestPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    submitOrganisationRegistrationRequestMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  // Test 1: Render the Page
  it('renders the organisation registration request page', () => {
    render(
      <MemoryRouter>
        <OrganisationRegistrationRequestPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: /Request to Register an Organisation/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /1\. Organisation Information/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /2\. Representative Information/i }),
    ).toBeInTheDocument();
  });

  // Test 2: Representative tab initially disabled
  it('disables the representative information tab initially', () => {
    render(
      <MemoryRouter>
        <OrganisationRegistrationRequestPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /2\. Representative Information/i })).toBeDisabled();
  });

  // Test 3: Step 1 of 2 is initially shown
  it('shows the organisation information form by default', () => {
    render(
      <MemoryRouter>
        <OrganisationRegistrationRequestPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /Step 1 of 2/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Organisation Information/i })).toBeInTheDocument();
  });

  // Test 4: Empty Form
  it('shows a validation message when progressing with an empty organisation form', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <OrganisationRegistrationRequestPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /Next/i }));

    expect(screen.getByText(/Please Enter An Organisation Name/i)).toBeInTheDocument();
  });

  // Test 5: Completing Step 1 enables Step 2
  it('enables the representative information tab after a valid organisation form', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <OrganisationRegistrationRequestPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/Organisation Name/i), 'CBELL Plumbing (Pty) Ltd');
    await user.type(screen.getByLabelText(/Organisation Size/i), '1');
    await user.click(screen.getByRole('button', { name: /Next/i }));

    expect(
      screen.getByRole('button', { name: /2\. Representative Information/i }),
    ).not.toBeDisabled();
  });

  it('submits the exact organisation registration request payload once', async () => {
    const user = userEvent.setup();

    submitOrganisationRegistrationRequestMock.mockResolvedValue({
      requestId: 'request-1',
      status: 'PENDING_REVIEW',
      confirmationEmailQueued: true,
    });

    renderOrganisationRegistrationRequestPage();

    await submitValidOrganisationRequest(user, {
      organisationDescription: ' Plumbing services ',
      organisationWebsiteUrl: ' https://cbell.example.com ',
    });

    await waitFor(() => {
      expect(submitOrganisationRegistrationRequestMock).toHaveBeenCalledTimes(1);
    });

    expect(submitOrganisationRegistrationRequestMock).toHaveBeenCalledWith({
      organisationName: 'CBELL Plumbing',
      organisationSize: 25,
      organisationDescription: 'Plumbing services',
      organisationWebsiteUrl: 'https://cbell.example.com',
      representativeFirstName: 'Casey',
      representativeLastName: 'Bell',
      representativeEmail: 'casey@example.com',
    });
  });

  it('omits empty optional description and website values from the payload', async () => {
    const user = userEvent.setup();

    submitOrganisationRegistrationRequestMock.mockResolvedValue({
      requestId: 'request-1',
      status: 'PENDING_REVIEW',
      confirmationEmailQueued: true,
    });

    renderOrganisationRegistrationRequestPage();

    await submitValidOrganisationRequest(user, {
      organisationDescription: '  ',
      organisationWebsiteUrl: ' ',
    });

    await waitFor(() => {
      expect(submitOrganisationRegistrationRequestMock).toHaveBeenCalledTimes(1);
    });

    expect(submitOrganisationRegistrationRequestMock).toHaveBeenCalledWith({
      organisationName: 'CBELL Plumbing',
      organisationSize: 25,
      representativeFirstName: 'Casey',
      representativeLastName: 'Bell',
      representativeEmail: 'casey@example.com',
    });
  });

  it('shows the approval email instruction when confirmation email is queued', async () => {
    const user = userEvent.setup();

    submitOrganisationRegistrationRequestMock.mockResolvedValue({
      requestId: 'request-1',
      status: 'PENDING_REVIEW',
      confirmationEmailQueued: true,
    });

    renderOrganisationRegistrationRequestPage();

    await submitValidOrganisationRequest(user);

    expect(
      await screen.findByRole('heading', { name: /Registration Request Submitted/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /If approved, you will receive an email with instructions to set up your Organisation Administrator account/i,
      ),
    ).toBeInTheDocument();
  });

  it('shows delayed confirmation email copy when confirmation email is not queued', async () => {
    const user = userEvent.setup();

    submitOrganisationRegistrationRequestMock.mockResolvedValue({
      requestId: 'request-1',
      status: 'PENDING_REVIEW',
      confirmationEmailQueued: false,
    });

    renderOrganisationRegistrationRequestPage();

    await submitValidOrganisationRequest(user);

    expect(
      await screen.findByRole('heading', { name: /Registration Request Submitted/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Confirmation email delivery may be delayed, but your request was received/i,
      ),
    ).toBeInTheDocument();
  });

  it('shows the conflict message when the request conflicts with existing records', async () => {
    const user = userEvent.setup();

    submitOrganisationRegistrationRequestMock.mockRejectedValue(
      createOrganisationRequestApiError(409, 'ORGANISATION_REQUEST_CONFLICT'),
    );

    renderOrganisationRegistrationRequestPage();

    await submitValidOrganisationRequest(user);

    expect(
      await screen.findByText(
        'A registration request already exists or conflicts with existing records. Please check the details or contact support.',
      ),
    ).toBeInTheDocument();
  });

  it('shows the first validation detail when the backend returns validation errors', async () => {
    const user = userEvent.setup();

    submitOrganisationRegistrationRequestMock.mockRejectedValue(
      createOrganisationRequestApiError(422, 'VALIDATION_ERROR', {
        error: 'VALIDATION_ERROR',
        details: [{ field: 'representativeEmail', message: 'Representative email is invalid.' }],
      }),
    );

    renderOrganisationRegistrationRequestPage();

    await submitValidOrganisationRequest(user);

    expect(await screen.findByText('Representative email is invalid.')).toBeInTheDocument();
  });

  it('shows the rate-limit message when the backend rate limits submissions', async () => {
    const user = userEvent.setup();

    submitOrganisationRegistrationRequestMock.mockRejectedValue(
      createOrganisationRequestApiError(429, 'TOO_MANY_REQUESTS'),
    );

    renderOrganisationRegistrationRequestPage();

    await submitValidOrganisationRequest(user);

    expect(
      await screen.findByText('Too many requests. Please wait and try again later.'),
    ).toBeInTheDocument();
  });

  it('shows a generic fallback when submission fails unexpectedly', async () => {
    const user = userEvent.setup();

    submitOrganisationRegistrationRequestMock.mockRejectedValue(new Error('Network failure'));

    renderOrganisationRegistrationRequestPage();

    await submitValidOrganisationRequest(user);

    expect(
      await screen.findByText('We could not submit the request right now. Please try again later.'),
    ).toBeInTheDocument();
  });

  it('disables the submit button while the request is pending', async () => {
    const user = userEvent.setup();
    let resolveSubmit: (value: {
      requestId: string;
      status: 'PENDING_REVIEW';
      confirmationEmailQueued: boolean;
    }) => void = () => {};

    submitOrganisationRegistrationRequestMock.mockReturnValue(
      new Promise((resolve) => {
        resolveSubmit = resolve;
      }),
    );

    renderOrganisationRegistrationRequestPage();

    await fillOrganisationStep(user);
    await fillRepresentativeStep(user);

    const submitButton = screen.getByRole('button', { name: /Complete Registration Request/i });

    await user.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent('Submitting Request...');

    resolveSubmit({
      requestId: 'request-1',
      status: 'PENDING_REVIEW',
      confirmationEmailQueued: true,
    });

    expect(
      await screen.findByRole('heading', { name: /Registration Request Submitted/i }),
    ).toBeInTheDocument();
  });

  it('clears the previous submit alert before retrying', async () => {
    const user = userEvent.setup();
    let resolveSecondSubmit: (value: {
      requestId: string;
      status: 'PENDING_REVIEW';
      confirmationEmailQueued: boolean;
    }) => void = () => {};

    submitOrganisationRegistrationRequestMock
      .mockRejectedValueOnce(createOrganisationRequestApiError(429, 'TOO_MANY_REQUESTS'))
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveSecondSubmit = resolve;
        }),
      );

    renderOrganisationRegistrationRequestPage();

    await fillOrganisationStep(user);
    await fillRepresentativeStep(user);

    await user.click(screen.getByRole('button', { name: /Complete Registration Request/i }));

    expect(
      await screen.findByText('Too many requests. Please wait and try again later.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Complete Registration Request/i }));

    expect(
      screen.queryByText('Too many requests. Please wait and try again later.'),
    ).not.toBeInTheDocument();

    resolveSecondSubmit({
      requestId: 'request-1',
      status: 'PENDING_REVIEW',
      confirmationEmailQueued: true,
    });

    expect(
      await screen.findByRole('heading', { name: /Registration Request Submitted/i }),
    ).toBeInTheDocument();
  });
});
