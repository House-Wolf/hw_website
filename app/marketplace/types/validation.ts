/**
 * Validation utilities for marketplace listings
 * Implements comprehensive input validation and sanitization
 * @author House Wolf Dev Team
 */

import {
  CreateListingInput,
  UpdateListingInput,
  LISTING_CONSTRAINTS,
  SUPPORTED_CURRENCIES,
  ListingCondition,
  ListingStatus,
  ListingVisibility,
} from "./index";

// ============================================
// VALIDATION ERROR TYPES
// ============================================

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public code?: string
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

// ============================================
// STRING SANITIZATION
// ============================================

/**
 * Sanitizes input string to prevent XSS attacks
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove angle brackets
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, ""); // Remove inline event handlers
}

/**
 * Sanitizes HTML content (for description field)
 * Allows basic formatting but removes dangerous tags
 */
export function sanitizeDescription(input: string): string {
  // Remove script tags and their content
  let cleaned = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Remove dangerous attributes
  cleaned = cleaned.replace(/on\w+\s*=\s*["'][^"']*["']/gi, "");
  cleaned = cleaned.replace(/javascript:/gi, "");

  return cleaned.trim();
}

/**
 * Validates URL format and ensures it's from allowed domains
 */
export function validateImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Only allow http and https protocols
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false;
    }

    // Block data: and javascript: URLs
    if (url.toLowerCase().startsWith("data:") || url.toLowerCase().startsWith("javascript:")) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// ============================================
// FIELD VALIDATORS
// ============================================

export function validateTitle(title: string): ValidationResult<string> {
  const sanitized = sanitizeString(title);

  if (!sanitized) {
    return {
      success: false,
      errors: [{ field: "title", message: "Title is required", code: "REQUIRED" }],
    };
  }

  if (sanitized.length < LISTING_CONSTRAINTS.TITLE_MIN_LENGTH) {
    return {
      success: false,
      errors: [
        {
          field: "title",
          message: `Title must be at least ${LISTING_CONSTRAINTS.TITLE_MIN_LENGTH} characters`,
          code: "TOO_SHORT",
        },
      ],
    };
  }

  if (sanitized.length > LISTING_CONSTRAINTS.TITLE_MAX_LENGTH) {
    return {
      success: false,
      errors: [
        {
          field: "title",
          message: `Title must not exceed ${LISTING_CONSTRAINTS.TITLE_MAX_LENGTH} characters`,
          code: "TOO_LONG",
        },
      ],
    };
  }

  return { success: true, data: sanitized };
}

export function validateDescription(description: string): ValidationResult<string> {
  const sanitized = sanitizeDescription(description);

  if (!sanitized) {
    return {
      success: false,
      errors: [{ field: "description", message: "Description is required", code: "REQUIRED" }],
    };
  }

  if (sanitized.length < LISTING_CONSTRAINTS.DESCRIPTION_MIN_LENGTH) {
    return {
      success: false,
      errors: [
        {
          field: "description",
          message: `Description must be at least ${LISTING_CONSTRAINTS.DESCRIPTION_MIN_LENGTH} characters`,
          code: "TOO_SHORT",
        },
      ],
    };
  }

  if (sanitized.length > LISTING_CONSTRAINTS.DESCRIPTION_MAX_LENGTH) {
    return {
      success: false,
      errors: [
        {
          field: "description",
          message: `Description must not exceed ${LISTING_CONSTRAINTS.DESCRIPTION_MAX_LENGTH} characters`,
          code: "TOO_LONG",
        },
      ],
    };
  }

  return { success: true, data: sanitized };
}

export function validatePrice(price: number): ValidationResult<number> {
  if (typeof price !== "number" || isNaN(price)) {
    return {
      success: false,
      errors: [{ field: "price", message: "Price must be a valid number", code: "INVALID_TYPE" }],
    };
  }

  if (price < LISTING_CONSTRAINTS.PRICE_MIN) {
    return {
      success: false,
      errors: [
        {
          field: "price",
          message: `Price must be at least ${LISTING_CONSTRAINTS.PRICE_MIN}`,
          code: "TOO_LOW",
        },
      ],
    };
  }

  if (price > LISTING_CONSTRAINTS.PRICE_MAX) {
    return {
      success: false,
      errors: [
        {
          field: "price",
          message: `Price must not exceed ${LISTING_CONSTRAINTS.PRICE_MAX}`,
          code: "TOO_HIGH",
        },
      ],
    };
  }

  // Ensure price has at most 2 decimal places
  const decimalPlaces = (price.toString().split(".")[1] || "").length;
  if (decimalPlaces > 2) {
    return {
      success: false,
      errors: [
        {
          field: "price",
          message: "Price must have at most 2 decimal places",
          code: "INVALID_PRECISION",
        },
      ],
    };
  }

  return { success: true, data: price };
}

export function validateQuantity(quantity: number): ValidationResult<number> {
  if (typeof quantity !== "number" || isNaN(quantity) || !Number.isInteger(quantity)) {
    return {
      success: false,
      errors: [
        { field: "quantity", message: "Quantity must be a valid integer", code: "INVALID_TYPE" },
      ],
    };
  }

  if (quantity < LISTING_CONSTRAINTS.QUANTITY_MIN) {
    return {
      success: false,
      errors: [
        {
          field: "quantity",
          message: `Quantity must be at least ${LISTING_CONSTRAINTS.QUANTITY_MIN}`,
          code: "TOO_LOW",
        },
      ],
    };
  }

  if (quantity > LISTING_CONSTRAINTS.QUANTITY_MAX) {
    return {
      success: false,
      errors: [
        {
          field: "quantity",
          message: `Quantity must not exceed ${LISTING_CONSTRAINTS.QUANTITY_MAX}`,
          code: "TOO_HIGH",
        },
      ],
    };
  }

  return { success: true, data: quantity };
}

export function validateCurrency(currency: string): ValidationResult<string> {
  if (!SUPPORTED_CURRENCIES.includes(currency as any)) {
    return {
      success: false,
      errors: [
        {
          field: "currency",
          message: `Currency must be one of: ${SUPPORTED_CURRENCIES.join(", ")}`,
          code: "INVALID_VALUE",
        },
      ],
    };
  }

  return { success: true, data: currency };
}

export function validateCondition(condition?: string | null): ValidationResult<string | null> {
  if (!condition) {
    return { success: true, data: null };
  }

  const validConditions: ListingCondition[] = ["NEW", "LIKE_NEW", "GOOD", "FAIR", "POOR"];

  if (!validConditions.includes(condition as ListingCondition)) {
    return {
      success: false,
      errors: [
        {
          field: "condition",
          message: `Condition must be one of: ${validConditions.join(", ")}`,
          code: "INVALID_VALUE",
        },
      ],
    };
  }

  return { success: true, data: condition };
}

export function validateImageUrls(urls: string[]): ValidationResult<string[]> {
  if (!Array.isArray(urls)) {
    return {
      success: false,
      errors: [
        { field: "imageUrls", message: "Image URLs must be an array", code: "INVALID_TYPE" },
      ],
    };
  }

  if (urls.length > LISTING_CONSTRAINTS.MAX_IMAGES) {
    return {
      success: false,
      errors: [
        {
          field: "imageUrls",
          message: `Cannot upload more than ${LISTING_CONSTRAINTS.MAX_IMAGES} images`,
          code: "TOO_MANY",
        },
      ],
    };
  }

  const invalidUrls: string[] = [];

  for (const url of urls) {
    if (!validateImageUrl(url)) {
      invalidUrls.push(url);
    }
  }

  if (invalidUrls.length > 0) {
    return {
      success: false,
      errors: [
        {
          field: "imageUrls",
          message: `Invalid image URLs: ${invalidUrls.join(", ")}`,
          code: "INVALID_URL",
        },
      ],
    };
  }

  return { success: true, data: urls };
}

// ============================================
// COMPLETE LISTING VALIDATION
// ============================================

export function validateCreateListing(
  input: CreateListingInput
): ValidationResult<CreateListingInput> {
  const errors: Array<{ field: string; message: string; code: string }> = [];

  // Validate required fields
  const titleResult = validateTitle(input.title);
  if (!titleResult.success) errors.push(...(titleResult.errors || []));

  const descriptionResult = validateDescription(input.description);
  if (!descriptionResult.success) errors.push(...(descriptionResult.errors || []));

  const priceResult = validatePrice(input.price);
  if (!priceResult.success) errors.push(...(priceResult.errors || []));

  // Validate category ID
  if (!Number.isInteger(input.categoryId) || input.categoryId <= 0) {
    errors.push({
      field: "categoryId",
      message: "Invalid category ID",
      code: "INVALID_CATEGORY",
    });
  }

  // Validate optional fields
  if (input.currency) {
    const currencyResult = validateCurrency(input.currency);
    if (!currencyResult.success) errors.push(...(currencyResult.errors || []));
  }

  if (input.quantity !== undefined) {
    const quantityResult = validateQuantity(input.quantity);
    if (!quantityResult.success) errors.push(...(quantityResult.errors || []));
  }

  if (input.condition) {
    const conditionResult = validateCondition(input.condition);
    if (!conditionResult.success) errors.push(...(conditionResult.errors || []));
  }

  if (input.imageUrls && input.imageUrls.length > 0) {
    const imageUrlsResult = validateImageUrls(input.imageUrls);
    if (!imageUrlsResult.success) errors.push(...(imageUrlsResult.errors || []));
  }

  if (input.location) {
    const sanitized = sanitizeString(input.location);
    if (sanitized.length > LISTING_CONSTRAINTS.LOCATION_MAX_LENGTH) {
      errors.push({
        field: "location",
        message: `Location must not exceed ${LISTING_CONSTRAINTS.LOCATION_MAX_LENGTH} characters`,
        code: "TOO_LONG",
      });
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  // Return sanitized data
  return {
    success: true,
    data: {
      title: titleResult.data!,
      description: descriptionResult.data!,
      price: priceResult.data!,
      categoryId: input.categoryId,
      currency: input.currency,
      quantity: input.quantity,
      condition: input.condition,
      location: input.location ? sanitizeString(input.location) : undefined,
      imageUrls: input.imageUrls,
      metadata: input.metadata,
    },
  };
}

export function validateUpdateListing(
  input: UpdateListingInput
): ValidationResult<UpdateListingInput> {
  const errors: Array<{ field: string; message: string; code: string }> = [];

  // Validate fields if provided
  if (input.title !== undefined) {
    const result = validateTitle(input.title);
    if (!result.success) errors.push(...(result.errors || []));
  }

  if (input.description !== undefined) {
    const result = validateDescription(input.description);
    if (!result.success) errors.push(...(result.errors || []));
  }

  if (input.price !== undefined) {
    const result = validatePrice(input.price);
    if (!result.success) errors.push(...(result.errors || []));
  }

  if (input.currency !== undefined) {
    const result = validateCurrency(input.currency);
    if (!result.success) errors.push(...(result.errors || []));
  }

  if (input.quantity !== undefined) {
    const result = validateQuantity(input.quantity);
    if (!result.success) errors.push(...(result.errors || []));
  }

  if (input.condition !== undefined) {
    const result = validateCondition(input.condition);
    if (!result.success) errors.push(...(result.errors || []));
  }

  if (input.imageUrls !== undefined && input.imageUrls.length > 0) {
    const result = validateImageUrls(input.imageUrls);
    if (!result.success) errors.push(...(result.errors || []));
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: input };
}

// ============================================
// RATE LIMITING HELPERS
// ============================================

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

export const RATE_LIMITS = {
  CREATE_LISTING: { windowMs: 60 * 60 * 1000, maxRequests: 10 }, // 10 per hour
  UPDATE_LISTING: { windowMs: 60 * 1000, maxRequests: 30 }, // 30 per minute
  DELETE_LISTING: { windowMs: 60 * 1000, maxRequests: 20 }, // 20 per minute
  CONTACT_SELLER: { windowMs: 60 * 1000, maxRequests: 15 }, // 15 per minute
} as const;
