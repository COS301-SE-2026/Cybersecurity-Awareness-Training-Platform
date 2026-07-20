import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import OrganisationInformationPage from '../OrganisationInformationPage';

// Mock AppLayout
vi.mock('../../components/layout/AppLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock Child Pages
vi.mock('../../components/organisation-information/BasicOrganisationInformationPage', () => ({
  default: () => <div>Basic Organisation Information</div>,
}));

vi.mock('../../components/organisation-information/RepresentativeInformationPage', () => ({
  default: () => <div>Organisation Representative Information</div>,
}));

vi.mock('../../components/organisation-information/OrganisationAdminInformationPage', () => ({
  default: () => <div>Organisation Administrators</div>,
}));

vi.mock('../../components/organisation-information/OrganisationTimelinePage', () => ({
  default: () => <div>Organisation Event Timeline</div>,
}));

// === BEGIN TESTING ===
describe('OrganisationInformationPage', () => {
  it('renders the page heading', () => {
    render(<OrganisationInformationPage />);
    expect(screen.getByRole('heading', { name: /Organisation Information/i })).toBeInTheDocument();
  });

  it('renders all navigation tabs', () => {
    render(<OrganisationInformationPage />);
    expect(screen.getByRole('button', { name: /Basic Information/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Representative Information/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Administrators/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Timeline/i })).toBeInTheDocument();
  });

  it('shows the Basic Information page by default', () => {
    render(<OrganisationInformationPage />);
    expect(screen.getByText(/Basic Organisation Information/i)).toBeInTheDocument();
    expect(screen.queryByText(/Organisation Representative Information/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Organisation Administrators/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Organisation Event Timeline/i)).not.toBeInTheDocument();
  });

  it('switches to the Representative Information tab', async () => {
    const user = userEvent.setup();
    render(<OrganisationInformationPage />);
    await user.click(screen.getByRole('button', { name: /Representative Information/i }));
    expect(screen.getByText(/Organisation Representative Information/i)).toBeInTheDocument();
    expect(screen.queryByText(/Basic Organisation Information/i)).not.toBeInTheDocument();
  });

  it('switches to the Administrators tab', async () => {
    const user = userEvent.setup();
    render(<OrganisationInformationPage />);
    await user.click(screen.getByRole('button', { name: /Administrators/i }));
    expect(screen.getByText(/Organisation Administrators/i)).toBeInTheDocument();
    expect(screen.queryByText(/Basic Organisation Information/i)).not.toBeInTheDocument();
  });

  it('switches to the Timeline tab', async () => {
    const user = userEvent.setup();
    render(<OrganisationInformationPage />);
    await user.click(screen.getByRole('button', { name: /Timeline/i }));
    expect(screen.getByText(/Organisation Event Timeline/i)).toBeInTheDocument();
    expect(screen.queryByText(/Basic Organisation Information/i)).not.toBeInTheDocument();
  });

  it('only displays one page at a time', async () => {
    const user = userEvent.setup();
    render(<OrganisationInformationPage />);
    await user.click(screen.getByRole('button', { name: /Timeline/i }));
    expect(screen.getByText(/Organisation Event Timeline/i)).toBeInTheDocument();
    expect(screen.queryByText(/Basic Organisation Information/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Organisation Representative Information/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Organisation Administrators/i)).not.toBeInTheDocument();
  });
});
// === END TESTING ===
