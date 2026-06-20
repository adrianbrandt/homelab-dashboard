import { it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test-utils.tsx';
import { Containers } from './Containers.tsx';

beforeEach(() => {
  vi.restoreAllMocks();
});

it('renders container rows from the API', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ data: { containers: [{ name: 'grafana', image: 'grafana/grafana:11', cpuPercent: 3, memUsedBytes: 1, memLimitBytes: 0, uptimeSeconds: 100 }], generatedAt: 'now' } }), { status: 200 }),
  );
  renderWithProviders(<Containers />, '/containers');
  await waitFor(() => expect(screen.getByText('grafana')).toBeInTheDocument());
});
