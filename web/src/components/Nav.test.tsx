import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test-utils.tsx';
import { Nav } from './Nav.tsx';
import * as client from '../api/client.ts';

describe('Nav', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('renders Overview and Containers links', () => {
    vi.spyOn(client, 'apiGet').mockResolvedValue({ user: null, required: false, logoutUrl: null });
    renderWithProviders(<Nav />, '/containers');
    expect(screen.getByRole('link', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Containers' })).toBeInTheDocument();
  });

  it('shows the user chip when /me reports a user', async () => {
    vi.spyOn(client, 'apiGet').mockResolvedValue({
      user: 'me@example.com',
      required: true,
      logoutUrl: null,
    });
    renderWithProviders(<Nav />, '/');
    await waitFor(() => expect(screen.getByText('me@example.com')).toBeInTheDocument());
  });

  it('shows no chip when there is no user', async () => {
    vi.spyOn(client, 'apiGet').mockResolvedValue({ user: null, required: false, logoutUrl: null });
    renderWithProviders(<Nav />, '/');
    await waitFor(() => expect(screen.getByRole('link', { name: 'Overview' })).toBeInTheDocument());
    expect(screen.queryByText('@')).toBeNull();
  });
});
