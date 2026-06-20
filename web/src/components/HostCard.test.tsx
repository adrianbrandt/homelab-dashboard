import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HostCard } from './HostCard.tsx';
import type { Host } from '@dashboard/shared';

const GB = 1024 ** 3;

function host(over: Partial<Host> = {}): Host {
  return {
    id: 'homelab',
    label: 'homelab',
    status: 'ok',
    links: [],
    metrics: {
      cpuPercent: 4,
      memUsedBytes: 2 * GB,
      memTotalBytes: 14 * GB,
      diskUsedBytes: 18 * GB,
      diskTotalBytes: 233 * GB,
      tempC: 42,
      uptimeSeconds: 17 * 86400,
      load: [0.04, 0.05, 0.06],
      gpu: null,
    },
    lastUpdated: 'now',
    ...over,
  };
}

describe('HostCard', () => {
  it('renders label, the three core bars, and footer', () => {
    render(<HostCard host={host()} />);
    expect(screen.getByText('homelab')).toBeInTheDocument();
    expect(screen.getByText('CPU')).toBeInTheDocument();
    expect(screen.getByText('RAM')).toBeInTheDocument();
    expect(screen.getByText('Disk')).toBeInTheDocument();
    expect(screen.getByText('up 17d')).toBeInTheDocument();
    expect(screen.getByText('42°C')).toBeInTheDocument();
  });

  it('renders GPU bars only when gpu metrics are present', () => {
    const { rerender } = render(<HostCard host={host()} />);
    expect(screen.queryByText('GPU')).not.toBeInTheDocument();
    rerender(
      <HostCard
        host={host({
          metrics: {
            ...host().metrics,
            gpu: { utilPercent: 40, vramUsedBytes: 2 * GB, vramTotalBytes: 6 * GB, tempC: 62 },
          },
        })}
      />,
    );
    expect(screen.getByText('GPU')).toBeInTheDocument();
    expect(screen.getByText('VRAM')).toBeInTheDocument();
  });

  it('shows an unreachable label when the host is down', () => {
    render(<HostCard host={host({ status: 'down' })} />);
    expect(screen.getByText('unreachable')).toBeInTheDocument();
    expect(screen.getByTestId('status-dot').dataset.status).toBe('down');
  });

  it('renders a storage-only variant: just the storage bar, no CPU/RAM/temp', () => {
    render(
      <HostCard
        host={host({
          id: 'nas', label: 'nas', kind: 'storage',
          metrics: { ...host().metrics, cpuPercent: 0, memTotalBytes: 0, memUsedBytes: 0, tempC: null, diskUsedBytes: 80 * GB, diskTotalBytes: 2000 * GB },
        })}
      />,
    );
    expect(screen.getByText('nas')).toBeInTheDocument();
    expect(screen.getByText('Storage')).toBeInTheDocument();
    expect(screen.queryByText('CPU')).not.toBeInTheDocument();
    expect(screen.queryByText('RAM')).not.toBeInTheDocument();
  });
});
