import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

vi.stubGlobal(
  'fetch',
  vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          app: 'Insightful Phish',
          api: 'working',
          database: 'connected',
          timestamp: '2026-04-26T00:00:00.000Z',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
  ),
);

describe('App', () => {
  it('renders the Insightful Phish status page', async () => {
    globalThis.history.pushState({}, '', '/status');

    render(<App />);

    expect(await screen.findByText('Hello from Insightful Phish!')).toBeTruthy();
    expect(await screen.findByText(/The API is/i)).toBeTruthy();
    expect(await screen.findByText(/The database is/i)).toBeTruthy();
  });
});
