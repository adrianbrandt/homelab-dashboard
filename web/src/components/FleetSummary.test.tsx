import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FleetSummary } from './FleetSummary.tsx';
import type { Host } from '@dashboard/shared';

const GB = 1024 ** 3;
function host(id: string, status: Host['status']): Host {
  return {
    id, label: id, status, links: [],
    metrics: { cpuPercent: 20, memUsedBytes: 4 * GB, memTotalBytes: 8 * GB, diskUsedBytes: 1 * GB, diskTotalBytes: 10 * GB, tempC: 40, uptimeSeconds: 1000, load: [0, 0, 0], gpu: null },
    lastUpdated: 'now',
  };
}

describe('FleetSummary', () => {
  it('shows up/total and derived fleet stats', () => {
    render(<FleetSummary hosts={[host('a', 'ok'), host('b', 'down')]} updatedAt={Date.now()} />);
    expect(screen.getByText(/1 \/ 2 hosts up/i)).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument(); // avg cpu of the up host
  });
});
