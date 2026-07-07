import OrganisationRegistrationRequestPage from '../OrganisationRegistrationRequestPage';

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

describe('OrganisationRegistrationRequestPage', () => {
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
});
