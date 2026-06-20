import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { HostDetail } from '@dashboard/shared';
import { apiGet } from '../api/client.ts';

export function useHostDetail(id: string) {
  return useQuery({
    queryKey: ['host', id, 'detail'],
    queryFn: () => apiGet<HostDetail>(`/hosts/${id}`),
    refetchInterval: 15000,
    placeholderData: keepPreviousData,
  });
}
