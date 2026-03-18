import { useMutation, useQueryClient } from "@tanstack/react-query";
import { contributionsApi } from "@/shared/api";
import type { ContributeRequest } from "@/shared/api/types";

export function useContribute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ContributeRequest) =>
      contributionsApi.contribute(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["items"] }),
  });
}
