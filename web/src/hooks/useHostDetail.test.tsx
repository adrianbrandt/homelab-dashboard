import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useHostDetail } from './useHostDetail.ts';

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('useHostDetail', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ data: { id: 'homelab', kernel: '6.8.0' } }) })),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it('fetches the detail for the given id', async () => {
    const { result } = renderHook(() => useHostDetail('homelab'), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.kernel).toBe('6.8.0');
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/hosts/homelab');
  });
});
