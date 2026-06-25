import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useTheme } from './useTheme.ts';
import * as client from '../api/client.ts';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const layout = (theme: object) => ({ settings: { title: 'Lab', theme }, groups: [] });

describe('useTheme', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-density');
    document.documentElement.style.removeProperty('--accent');
  });

  it('applies config defaults to <html> when no viewer choice', async () => {
    vi.spyOn(client, 'apiGet').mockResolvedValue(layout({ mode: 'light', density: 'compact' }));
    renderHook(() => useTheme(), { wrapper });
    await waitFor(() => {
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(document.documentElement.getAttribute('data-density')).toBe('compact');
    });
  });

  it('viewer localStorage choice wins over config', async () => {
    localStorage.setItem('hld:theme', 'light');
    vi.spyOn(client, 'apiGet').mockResolvedValue(layout({ mode: 'dark', density: 'comfortable' }));
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(document.documentElement.getAttribute('data-theme')).toBe('light'));
    expect(result.current.mode).toBe('light');
  });

  it('applies config accent as a CSS variable', async () => {
    vi.spyOn(client, 'apiGet').mockResolvedValue(
      layout({ mode: 'dark', density: 'comfortable', accent: '#123456' }),
    );
    renderHook(() => useTheme(), { wrapper });
    await waitFor(() =>
      expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#123456'),
    );
  });

  it('cycleMode cycles dark → light → auto and persists the viewer choice', async () => {
    vi.spyOn(client, 'apiGet').mockResolvedValue(layout({ mode: 'dark', density: 'comfortable' }));
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.mode).toBe('dark'));
    act(() => result.current.cycleMode());
    expect(result.current.mode).toBe('light');
    expect(localStorage.getItem('hld:theme')).toBe('light');
    act(() => result.current.cycleMode());
    expect(result.current.mode).toBe('auto');
  });

  it("resolves 'auto' to a concrete data-theme via matchMedia (dark OS)", async () => {
    localStorage.setItem('hld:theme', 'auto');
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      media: '',
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList);
    vi.spyOn(client, 'apiGet').mockResolvedValue(layout({ mode: 'dark', density: 'comfortable' }));
    renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(document.documentElement.getAttribute('data-theme')).toBe('dark'));
  });
});
