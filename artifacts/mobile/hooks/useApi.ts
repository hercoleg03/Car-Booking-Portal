import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/contexts/AuthContext";

export function useApiQuery<T>(
  queryKey: unknown[],
  path: string,
  options?: { enabled?: boolean; params?: Record<string, string | number | null | undefined> }
) {
  return useQuery<T>({
    queryKey,
    enabled: options?.enabled !== false,
    queryFn: async () => {
      let url = path;
      if (options?.params) {
        const qs = Object.entries(options.params)
          .filter(([, v]) => v != null)
          .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
          .join("&");
        if (qs) url += `?${qs}`;
      }
      const res = await apiFetch(`/api${url}`);
      if (!res.ok) throw new Error("Errore di rete");
      return res.json() as Promise<T>;
    },
  });
}
