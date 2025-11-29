/**
 * Marketplace Type Definitions
 * Centralized type definitions for the marketplace feature
 * @author House Wolf Dev Team
 */

import { Decimal } from "@prisma/client/runtime/library";

// ============================================
// DATABASE TYPES (matching Prisma schema)
// ============================================

export type ListingStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "ACTIVE"
  | "SOLD"
  | "EXPIRED"
  | "SUSPENDED"
  | "DELETED";

export type ListingVisibility = "PUBLIC" | "PRIVATE" | "UNLISTED";

export type ListingCondition = "NEW" | "LIKE_NEW" | "GOOD" | "FAIR" | "POOR";

export interface MarketplaceListing {
  id: string;
  sellerUserId: string;
  title: string;
  description: string;
  categoryId: number;
  price: Decimal;
  currency: string;
  quantity: number;
  condition: string | null;
  status: string;
  discordThreadId: string | null;
  discordChannelId: string | null;
  expiresAt: Date | null;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  visibility: string;
  location: string | null;
  viewCount: number;
  messageCount: number;
  externalId: string | null;
  externalSource: string | null;
  externalData: any;
  publishedAt: Date | null;
  archivedAt: Date | null;
}

export interface MarketplaceCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  parentId: number | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MarketplaceListingImage {
  id: number;
  listingId: string;
  imageUrl: string;
  sortOrder: number;
  createdAt: Date;
}

export interface MarketplaceUserStatus {
  userId: string;
  isSuspended: boolean;
  reason: string | null;
  suspendedBy: string | null;
  suspendedAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ListingWithRelations extends MarketplaceListing {
  seller: {
    id: string;
    discordId: string;
    discordUsername: string;
    discordDisplayName: string | null;
    avatarUrl: string | null;
  };
  category: MarketplaceCategory;
  images: MarketplaceListingImage[];
}

export interface PaginationMetadata {
  total: number;
  totalPages: number;
  currentPage: number;
  perPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ListingsResponse {
  listings: ListingWithRelations[];
  pagination: PaginationMetadata;
}

export interface ListingDetailResponse {
  listing: ListingWithRelations;
  relatedListings?: ListingWithRelations[];
}

// ============================================
// FRONTEND DISPLAY TYPES
// ============================================

export interface DisplayListing {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  categoryId: number;
  quantity: number;
  condition: string | null;
  imageUrl: string | null;
  images: string[];
  seller: {
    id: string;
    discordId: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  status: ListingStatus;
  createdAt: Date;
  viewCount: number;
  location: string | null;
}

export interface ContactedListing {
  listingId: string;
  inviteUrl?: string;
  needsInvite?: boolean;
  threadUrl?: string;
  threadName?: string;
  contactedAt: number;
}

export interface ModalData {
  isOpen: boolean;
  onClose: () => void;
  inviteUrl?: string | null;
  itemTitle?: string | null;
  threadUrl?: string | null;
}

// ============================================
// FORM & INPUT TYPES
// ============================================

export interface CreateListingInput {
  title: string;
  description: string;
  categoryId: number;
  price: number;
  currency?: string;
  quantity?: number;
  condition?: ListingCondition;
  location?: string;
  imageUrls?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateListingInput extends Partial<CreateListingInput> {
  status?: ListingStatus;
  visibility?: ListingVisibility;
}

export interface ListingFilters {
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  condition?: ListingCondition;
  sellerId?: string;
  searchQuery?: string;
  status?: ListingStatus[];
}

export interface ListingSort {
  field: "price" | "createdAt" | "viewCount" | "title";
  order: "asc" | "desc";
}

// ============================================
// CONTACT SELLER TYPES
// ============================================

export interface ContactSellerRequest {
  sellerDiscordId: string;
  itemTitle: string;
  itemPrice: number;
  itemImageUrl?: string;
  sellerUsername: string;
}

export interface ContactSellerResponse {
  success: boolean;
  method: "dm" | "thread" | "invite_required" | "channel";
  threadUrl?: string;
  threadName?: string;
  message?: string;
  error?: string;
}

// ============================================
// ADMIN TYPES
// ============================================

export interface AdminAction {
  action: "approve" | "suspend" | "delete" | "edit" | "restore";
  listingId: string;
  reason?: string;
  actorId: string;
}

export interface AuditLogEntry {
  id: number;
  listingId: string;
  actorId: string | null;
  action: string;
  oldValues: any;
  newValues: any;
  createdAt: Date;
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

export const LISTING_CONSTRAINTS = {
  TITLE_MIN_LENGTH: 3,
  TITLE_MAX_LENGTH: 100,
  DESCRIPTION_MIN_LENGTH: 10,
  DESCRIPTION_MAX_LENGTH: 5000,
  PRICE_MIN: 0,
  PRICE_MAX: 999999999999,
  QUANTITY_MIN: 1,
  QUANTITY_MAX: 999999,
  MAX_IMAGES: 10,
  LOCATION_MAX_LENGTH: 100,
} as const;

export const SUPPORTED_CURRENCIES = ["aUEC"] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

export const DEFAULT_CURRENCY: SupportedCurrency = "aUEC";

// ============================================
// PERMISSION TYPES
// ============================================

export interface MarketplacePermissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canViewDrafts: boolean;
  canApprove: boolean;
  canSuspend: boolean;
  isAdmin: boolean;
}
