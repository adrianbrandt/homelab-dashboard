import { useQuery } from '@tanstack/react-query';
import type { LayoutResponse } from '@dashboard/shared';
import { apiGet } from '../api/client.ts';

export function useLayout() {
  return useQuery({
    queryKey: ['layout'],
    queryFn: () => apiGet<LayoutResponse>('/layout'),
  });
}
