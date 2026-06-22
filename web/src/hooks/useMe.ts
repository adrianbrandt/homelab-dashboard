import { useQuery } from '@tanstack/react-query';
import type { MeResponse } from '@dashboard/shared';
import { apiGet } from '../api/client.ts';

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => apiGet<MeResponse>('/me'),
    refetchInterval: 60000,
  });
}
