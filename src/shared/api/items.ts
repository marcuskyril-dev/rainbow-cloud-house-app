import { apiClient } from "./client";
import type {
  WishlistItemView,
  CreateItemRequest,
  UpdateItemRequest,
  PaginatedResponse,
  PresignRequest,
  PresignResponse,
  ItemStatus,
} from "./types";

export const itemsApi = {
  list: (params?: { status?: ItemStatus; limit?: number; cursor?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.cursor) searchParams.set("cursor", params.cursor);
    const qs = searchParams.toString();
    return apiClient.get<PaginatedResponse<WishlistItemView>>(
      `/items${qs ? `?${qs}` : ""}`,
    );
  },

  get: (id: string) =>
    apiClient.get<{ item: WishlistItemView }>(`/items/${id}`),

  create: (data: CreateItemRequest) =>
    apiClient.post<{ item: WishlistItemView }>("/items", data),

  update: (id: string, data: UpdateItemRequest) =>
    apiClient.put<{ item: WishlistItemView }>(`/items/${id}`, data),

  delete: (id: string) => apiClient.delete<void>(`/items/${id}`),

  presignUpload: (data: PresignRequest) =>
    apiClient.post<PresignResponse>("/uploads/presign", data),
};
