import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import LandingPage from '../LandingPage';

// Test 1: Page Renders
describe('LandingPage', () => {
  it('renders the landing page heading', () => {
    render(<LandingPage />);
    expect(screen.getByText(/DON'T TAKE THE BAIT./i)).toBeInTheDocument();
  });
});
