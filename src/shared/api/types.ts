export type ItemStatus =
  | "available"
  | "partially_funded"
  | "funded"
  | "archived";

export type ItemPriority = "must_have" | "nice_to_have" | "dream";

export interface WishlistItemView {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  productUrl?: string;
  status: ItemStatus;
  totalContributed: number;
  isSplitGift: boolean;
  category?: string;
  priority: ItemPriority;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface Contribution {
  id: string;
  itemId: string;
  contributorName: string;
  amount: number;
  createdAt: string;
}

export interface OgMetadata {
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
}

export interface CreateItemRequest {
  name: string;
  description?: string;
  price: number;
  productUrl?: string;
  imageUrl?: string;
  isSplitGift?: boolean;
  category?: string;
  priority?: ItemPriority;
}

export interface UpdateItemRequest {
  name?: string;
  description?: string;
  price?: number;
  productUrl?: string;
  imageUrl?: string;
  isSplitGift?: boolean;
  category?: string;
  priority?: ItemPriority;
  status?: ItemStatus;
  expectedVersion: number;
}

export interface ContributeRequest {
  itemId: string;
  contributorName: string;
  amount: number;
  requestId: string;
}

export interface MetadataFetchRequest {
  productUrl: string;
}

export interface PresignRequest {
  fileName: string;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  fileSize: number;
}

export interface PresignResponse {
  uploadUrl: string;
  objectKey: string;
  publicUrl: string;
}
