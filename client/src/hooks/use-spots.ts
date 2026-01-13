import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useSpots() {
  return useQuery({
    queryKey: [api.spots.list.path],
    queryFn: async () => {
      const res = await fetch(api.spots.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch spots");
      return api.spots.list.responses[200].parse(await res.json());
    },
  });
}

export function useSpot(id: number) {
  return useQuery({
    queryKey: [api.spots.get.path, id],
    enabled: !isNaN(id),
    queryFn: async () => {
      const url = buildUrl(api.spots.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch spot");
      return api.spots.get.responses[200].parse(await res.json());
    },
  });
}
