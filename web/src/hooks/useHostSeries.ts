import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { HostSeries, SeriesWindow } from '@dashboard/shared';
import { apiGet } from '../api/client.ts';

export function useHostSeries(id: string, window: SeriesWindow) {
  return useQuery({
    queryKey: ['host', id, 'series', window],
    queryFn: () => apiGet<HostSeries>(`/hosts/${id}/series?window=${window}`),
    refetchInterval: 15000,
    placeholderData: keepPreviousData,
  });
}
