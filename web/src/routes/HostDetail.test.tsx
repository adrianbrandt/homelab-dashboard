import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { HostDetail } from './HostDetail.tsx';

const GB = 1024 ** 3;
const hostsPayload = {
  data: {
    hosts: [
      {
        id: 'homelab', label: 'homelab', status: 'ok',
        links: [{ label: 'Grafana', url: 'https://grafana.example.com' }],
        metrics: { cpuPercent: 16, memUsedBytes: 2 * GB, memTotalBytes: 14 * GB, diskUsedBytes: 18 * GB, diskTotalBytes: 233 * GB, tempC: 44, uptimeSeconds: 86400, load: [0.65, 0.2, 0.1], gpu: null },
        lastUpdated: 'now',
      },
    ],
    generatedAt: 'now',
  },
};
const detailPayload = { data: { id: 'homelab', cpuCores: [12, 8], filesystems: [{ mountpoint: '/', usedBytes: 18 * GB, totalBytes: 233 * GB }], temps: [{ label: 'temp1', celsius: 44 }], network: [{ device: 'eth0', rxBytesPerSec: 2 * 1024 * 1024, txBytesPerSec: 400 * 1024 }], bootTime: 1000, kernel: '6.8.0', os: 'Ubuntu 26.04' } };
const seriesPayload = { data: { id: 'homelab', window: '6h', stepSeconds: 300, metrics: { cpu: [{ t: 1, v: 10 }, { t: 2, v: 16 }], ram: [], disk: [], temp: [], load: [], netRx: [], netTx: [] } } };

function mockFetch() {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('/series')) return { ok: true, json: async () => seriesPayload };
    if (/\/api\/hosts\/[^/]+$/.test(url)) return { ok: true, json: async () => detailPayload };
    return { ok: true, json: async () => hostsPayload };
  }));
}

function renderAt(id: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/host/${id}`]}>
        <Routes>
          <Route path="/host/:id" element={<HostDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('HostDetail', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('renders system info and quick links for a known host', async () => {
    mockFetch();
    renderAt('homelab');
    await waitFor(() => expect(screen.getByText('Ubuntu 26.04')).toBeInTheDocument());
    expect(screen.getByText('6.8.0')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Grafana' })).toHaveAttribute('href', 'https://grafana.example.com');
  });

  it('shows a not-found state for an unknown host id', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (/\/api\/hosts\/[^/]+$/.test(url) && !url.includes('/series')) return { ok: false, status: 404, json: async () => ({}) };
      return { ok: true, json: async () => hostsPayload };
    }));
    renderAt('ghost');
    await waitFor(() => expect(screen.getByText(/not found/i)).toBeInTheDocument());
  });

  it('shows the error state (not an infinite spinner) when the host is present but its detail query fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/series')) return { ok: true, json: async () => seriesPayload };
      if (/\/api\/hosts\/[^/]+$/.test(url)) return { ok: false, status: 500, json: async () => ({}) };
      return { ok: true, json: async () => hostsPayload };
    }));
    renderAt('homelab');
    await waitFor(() => expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument());
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /overview/i })).toBeInTheDocument();
  });

  it('renders the range toggle with three windows', async () => {
    mockFetch();
    renderAt('homelab');
    await waitFor(() => expect(screen.getByText('Ubuntu 26.04')).toBeInTheDocument());
    const toggle = screen.getByTestId('range-toggle');
    expect(within(toggle).getByText('1h')).toBeInTheDocument();
    expect(within(toggle).getByText('6h')).toBeInTheDocument();
    expect(within(toggle).getByText('24h')).toBeInTheDocument();
  });
});
