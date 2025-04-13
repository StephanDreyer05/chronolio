import { useQuery } from '@tanstack/react-query';

export const usePublicTemplates = (page: number = 1, limit: number = 10) => {
  return useQuery({
    queryKey: ['publicTemplates', page, limit],
    queryFn: async () => {
      const response = await fetch(`/api/templates/public?page=${page}&limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch public templates');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUserTemplates = () => {
  return useQuery({
    queryKey: ['userTemplates'],
    queryFn: async () => {
      const response = await fetch('/api/templates');
      if (!response.ok) {
        throw new Error('Failed to fetch user templates');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}; 