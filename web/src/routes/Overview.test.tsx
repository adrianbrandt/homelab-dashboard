import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import { Overview } from './Overview.tsx';

vi.mock('../hooks/useLayout.ts', () => ({
  useLayout: () => ({
    data: {
      settings: { title: 'Homelab' },
      groups: [{ name: 'Media', widgets: [{ id: '0-0', type: 'bookmarks' }] }],
    },
  }),
}));

vi.mock('../hooks/useWidget.ts', () => ({
  useWidget: () => ({
    data: { ok: true, data: { items: [{ label: 'Sonarr', url: 'https://sonarr' }] } },
    isPending: false,
    isError: false,
  }),
}));

function renderOverview(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

function mockHostsOnce(hosts: unknown[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: { hosts, generatedAt: 'now' } }),
    })),
  );
}

describe('Overview', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows skeletons while loading', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    const { container } = renderOverview(<Overview />);
    expect(container.querySelectorAll('[data-testid="skeleton"]').length).toBeGreaterThan(0);
  });

  it('renders a card per host once loaded', async () => {
    mockHostsOnce([
      { id: 'homelab', label: 'homelab', status: 'ok', metrics: baseMetrics(), lastUpdated: 'now' },
      { id: 'kvm4', label: 'kvm4', status: 'ok', metrics: baseMetrics(), lastUpdated: 'now' },
    ]);
    renderOverview(<Overview />);
    await waitFor(() => expect(screen.getByText('homelab')).toBeInTheDocument());
    expect(screen.getByText('kvm4')).toBeInTheDocument();
  });

  it('shows an empty state when no hosts are configured', async () => {
    mockHostsOnce([]);
    renderOverview(<Overview />);
    await waitFor(() => expect(screen.getByText(/no hosts configured/i)).toBeInTheDocument());
  });

  it('renders configured widget groups', async () => {
    mockHostsOnce([
      { id: 'homelab', label: 'homelab', status: 'ok', metrics: baseMetrics(), lastUpdated: 'now' },
    ]);
    renderOverview(<Overview />);
    expect(await screen.findByRole('heading', { name: 'Media' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sonarr' })).toBeInTheDocument();
  });
});

const GB = 1024 ** 3;
function baseMetrics() {
  return {
    cpuPercent: 4,
    memUsedBytes: 2 * GB,
    memTotalBytes: 14 * GB,
    diskUsedBytes: 18 * GB,
    diskTotalBytes: 233 * GB,
    tempC: 42,
    uptimeSeconds: 86400,
    load: [0.04, 0.05, 0.06],
    gpu: null,
  };
}
