import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { HostsResponse } from '@dashboard/shared';
import { apiGet } from '../api/client.ts';

export function useHosts() {
  return useQuery({
    queryKey: ['hosts'],
    queryFn: () => apiGet<HostsResponse>('/hosts'),
    refetchInterval: 15000,
    placeholderData: keepPreviousData,
  });
}
