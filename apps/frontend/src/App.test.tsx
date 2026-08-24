import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the current routed application', async () => {
    render(<App />);

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: "DON'T TAKE THE BAIT.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument();
  });
});
