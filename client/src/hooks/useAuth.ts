import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, isError } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    // Treat errors as "not authenticated" instead of hanging
    throwOnError: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !isError,
  };
}
