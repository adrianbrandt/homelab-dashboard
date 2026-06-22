import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from './test-utils.tsx';
import { App } from './App.tsx';
import * as client from './api/client.ts';

describe('App auth gate', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('renders the blocked page when required and unauthenticated', async () => {
    vi.spyOn(client, 'apiGet').mockImplementation(async (resource: string) => {
      if (resource === '/me') return { user: null, required: true, logoutUrl: null };
      return { hosts: [], generatedAt: '' };
    });
    renderWithProviders(<App />, '/');
    await waitFor(() =>
      expect(screen.getByText('Authentication required')).toBeInTheDocument(),
    );
    expect(screen.queryByRole('link', { name: 'Overview' })).toBeNull();
  });

  it('renders the dashboard when authenticated', async () => {
    vi.spyOn(client, 'apiGet').mockImplementation(async (resource: string) => {
      if (resource === '/me') return { user: 'me@example.com', required: true, logoutUrl: null };
      return { hosts: [], generatedAt: '' };
    });
    renderWithProviders(<App />, '/');
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Overview' })).toBeInTheDocument(),
    );
  });
});
