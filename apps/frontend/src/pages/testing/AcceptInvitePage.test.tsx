import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AcceptInvitePage from '../AcceptInvitePage';

describe('AcceptInvitePage', () => {
  it('renders the page heading', () => {
    render(
      <MemoryRouter>
        <AcceptInvitePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /Accept Invitation/i })).toBeInTheDocument();
  });

  it('renders the invitation details headings', () => {
    render(
      <MemoryRouter>
        <AcceptInvitePage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Invitation Type/i)).toBeInTheDocument();
    expect(screen.getByText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByText(/Granted Role/i)).toBeInTheDocument();
  });

  it('renders the accept and decline buttons', () => {
    render(
      <MemoryRouter>
        <AcceptInvitePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /Accept Invite/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Decline Invite/i })).toBeInTheDocument();
  });
});
