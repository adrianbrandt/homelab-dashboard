import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../test-utils.tsx';
import { Nav } from './Nav.tsx';
import * as client from '../api/client.ts';

describe('Nav', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

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

  it('renders theme and density toggles with accessible names', () => {
    vi.spyOn(client, 'apiGet').mockResolvedValue({ user: null, required: false, logoutUrl: null });
    renderWithProviders(<Nav />, '/');
    expect(screen.getByRole('button', { name: /theme/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /density/i })).toBeInTheDocument();
  });

  it('cycles the theme when the theme toggle is clicked', () => {
    vi.spyOn(client, 'apiGet').mockResolvedValue({ user: null, required: false, logoutUrl: null });
    renderWithProviders(<Nav />, '/');
    fireEvent.click(screen.getByRole('button', { name: /theme/i }));
    expect(localStorage.getItem('hld:theme')).toBeTruthy();
  });
});
