import { apiClient } from "./client";
import type {
  ContributeRequest,
  Contribution,
  WishlistItemView,
} from "./types";

export const contributionsApi = {
  contribute: (data: ContributeRequest) =>
    apiClient.post<{ contribution: Contribution; item: WishlistItemView }>(
      "/contribute",
      data,
    ),
};
