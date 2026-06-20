import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContainerTable } from './ContainerTable.tsx';
import type { Container } from '@dashboard/shared';

const MB = 1024 ** 2;
function c(over: Partial<Container> = {}): Container {
  return { name: 'grafana', image: 'grafana/grafana:11', cpuPercent: 3.2, memUsedBytes: 180 * MB, memLimitBytes: 512 * MB, uptimeSeconds: 9 * 86400, ...over };
}

describe('ContainerTable', () => {
  it('renders a row per container with name, image, cpu and uptime', () => {
    render(<ContainerTable containers={[c(), c({ name: 'caddy', image: 'caddy:2.8', cpuPercent: 1 })]} />);
    expect(screen.getByText('grafana')).toBeInTheDocument();
    expect(screen.getByText('caddy')).toBeInTheDocument();
    expect(screen.getByText('3.2%')).toBeInTheDocument();
    expect(screen.getAllByText('up 9d').length).toBeGreaterThan(0);
  });

  it('shows "unlimited" memory when limit is 0', () => {
    render(<ContainerTable containers={[c({ memLimitBytes: 0 })]} />);
    expect(screen.getByText(/unlimited/)).toBeInTheDocument();
  });

  it('renders an empty hint when there are no containers', () => {
    render(<ContainerTable containers={[]} />);
    expect(screen.getByText(/no containers/i)).toBeInTheDocument();
  });
});
