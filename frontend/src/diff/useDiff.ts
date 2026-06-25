import { useQuery } from "@tanstack/react-query";
import { fetchDiff } from "@/lib/api";

export function useDiff() {
  return useQuery({
    queryKey: ["diff"],
    queryFn: fetchDiff,
  });
}
