import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useMe } from './useMe.ts';
import * as client from '../api/client.ts';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useMe', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('fetches /me and returns the MeResponse', async () => {
    vi.spyOn(client, 'apiGet').mockResolvedValue({
      user: 'me@example.com',
      required: true,
      logoutUrl: '/cdn-cgi/access/logout',
    });
    const { result } = renderHook(() => useMe(), { wrapper });
    await waitFor(() => expect(result.current.data?.user).toBe('me@example.com'));
    expect(client.apiGet).toHaveBeenCalledWith('/me');
  });
});
