import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { ContainersResponse } from '@dashboard/shared';
import { apiGet } from '../api/client.ts';

export function useContainers() {
  return useQuery({
    queryKey: ['containers'],
    queryFn: () => apiGet<ContainersResponse>('/containers'),
    refetchInterval: 15000,
    placeholderData: keepPreviousData,
  });
}
