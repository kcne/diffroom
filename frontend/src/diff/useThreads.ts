import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createThread, fetchThreads, type ThreadCreate } from "@/lib/api";

const THREADS_KEY = ["threads"] as const;

export function useThreads() {
  return useQuery({
    queryKey: THREADS_KEY,
    queryFn: fetchThreads,
  });
}

export function useCreateThread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ThreadCreate) => createThread(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: THREADS_KEY });
    },
  });
}
