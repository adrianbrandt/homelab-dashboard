import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useHosts } from './useHosts.ts';

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('useHosts', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          data: { hosts: [{ id: 'homelab', label: 'homelab', status: 'ok' }], generatedAt: 'now' },
        }),
      })),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it('fetches and returns the hosts payload', async () => {
    const { result } = renderHook(() => useHosts(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.hosts[0].id).toBe('homelab');
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/hosts');
  });
});
