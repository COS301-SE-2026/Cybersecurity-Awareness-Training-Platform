import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import LandingPage from '../LandingPage';

describe('LandingPage', () => {
  it('renders the landing page heading', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/DON'T TAKE THE BAIT./i)).toBeInTheDocument();
  });
  it('renders the login link', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument();
  });
  it('renders the features section', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: /^Phishing Simulations$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Interactive Training/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Knowledge Quizzes/i })).toBeInTheDocument();
  });
  it('replaces the team section with more feature information', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: /Campaign Management/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Adaptive Learning/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Progress & Insights/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Team/i })).not.toBeInTheDocument();
  });
  it('renders the navbar links', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /Home/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /About & FAQs/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Features/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Team/i })).not.toBeInTheDocument();
  });
  it('login link is keyboard accessible', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    const Login_Link = screen.getByRole('link', { name: /login/i });
    Login_Link.focus();
    expect(Login_Link).toHaveFocus();
  });
});
