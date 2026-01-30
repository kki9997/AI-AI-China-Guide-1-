import { useQuery } from "@tanstack/react-query";
import type { TourGuide } from "@shared/schema";

export function useGuides() {
  return useQuery<TourGuide[]>({
    queryKey: ["/api/guides"],
  });
}

export function useGuide(id: number) {
  return useQuery<TourGuide>({
    queryKey: ["/api/guides", id],
    enabled: id > 0,
  });
}
