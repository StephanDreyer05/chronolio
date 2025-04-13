import { QueryClient } from "@tanstack/react-query";
import { fetchWithAuth } from "./api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        console.log(`[Query] Executing query for key: ${queryKey[0]}`);
        
        try {
          const startTime = performance.now();
          const response = await fetchWithAuth(queryKey[0] as string);
          const duration = Math.round(performance.now() - startTime);
          
          if (!response.ok) {
            const statusText = response.statusText || '';
            let errorDetails = '';
            
            try {
              const errorText = await response.text();
              errorDetails = errorText;
              console.error(`[Query] Error ${response.status} ${statusText} after ${duration}ms: ${queryKey[0]}`);
              console.error(`[Query] Error details: ${errorText}`);
            } catch (parseError) {
              console.error(`[Query] Error ${response.status} ${statusText} after ${duration}ms: ${queryKey[0]}`);
              console.error('[Query] Could not parse error response:', parseError);
            }
            
            throw new Error(`API Error ${response.status}: ${errorDetails || statusText || 'Unknown error'}`);
          }
          
          const data = await response.json();
          console.log(`[Query] Success for key: ${queryKey[0]} (${duration}ms)`);
          return data;
        } catch (error) {
          console.error(`[Query] Failed for key: ${queryKey[0]}:`, error);
          throw error;
        }
      },
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000, // 1 minute before data is considered stale
    },
    mutations: {
      retry: false,
    }
  },
});
