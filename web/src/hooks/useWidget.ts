import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { WidgetResult } from '@dashboard/shared';
import { apiGetRaw } from '../api/client.ts';

export function useWidget(id: string, enabled = true) {
  return useQuery({
    queryKey: ['widget', id],
    queryFn: () => apiGetRaw<WidgetResult>(`/widget/${id}`),
    refetchInterval: 15000,
    placeholderData: keepPreviousData,
    enabled,
  });
}
