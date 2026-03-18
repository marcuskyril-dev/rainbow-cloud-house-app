import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { itemsApi } from "@/shared/api";
import type {
  CreateItemRequest,
  UpdateItemRequest,
  ItemStatus,
} from "@/shared/api/types";

const ITEMS_KEY = ["items"] as const;

export function useItems(status?: ItemStatus) {
  return useQuery({
    queryKey: [...ITEMS_KEY, { status }],
    queryFn: () => itemsApi.list(status ? { status } : undefined),
  });
}

export function useItem(id: string) {
  return useQuery({
    queryKey: [...ITEMS_KEY, id],
    queryFn: () => itemsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateItemRequest) => itemsApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ITEMS_KEY }),
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateItemRequest }) =>
      itemsApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ITEMS_KEY }),
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => itemsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ITEMS_KEY }),
  });
}
