import { QueryClient } from '@tanstack/react-query';
import { QUERY_CONFIG } from '../config';
export const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: QUERY_CONFIG.staleTime, retry: QUERY_CONFIG.retry, refetchOnWindowFocus: false } } });
