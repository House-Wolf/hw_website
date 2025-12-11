type BaseLimits = {
  titleMax: number;
  descriptionMax: number;
  locationMax: number;
  minPrice: number;
  maxPrice: number;
  minQuantity: number;
  maxQuantity: number;
};

export const LISTING_LIMITS: BaseLimits = {
  titleMax: 120,
  descriptionMax: 2000,
  locationMax: 120,
  minPrice: 1,
  maxPrice: 1_000_000_000,
  minQuantity: 1,
  maxQuantity: 9999,
};

type CreateInput = {
  title: string;
  description: string;
  categoryId: string;
  price: string;
  quantity?: string;
  location?: string;
  imageUrl?: string;
};

type UpdateInput = Partial<{
  title: string;
  description: string;
  categoryId: string;
  price: string;
  quantity: string;
  location: string | null;
  imageUrl: string | null;
}>;

type ParsedBase = {
  title?: string;
  description?: string;
  categoryId?: number;
  price?: number;
  quantity?: number;
  location?: string | null;
  imageUrl?: string | null;
};

type ValidationResult<T> = { ok: true; parsed: T } | { ok: false; error: string };

export function validateCreateListingInput(input: CreateInput): ValidationResult<
  ParsedBase & Required<Pick<ParsedBase, "title" | "description" | "categoryId" | "price" | "quantity">>
> {
  const { title, description, categoryId, price, quantity, location, imageUrl } = input;
  const trimmedTitle = title.trim();
  const trimmedDescription = description.trim();
  const trimmedLocation = location?.trim();
  const trimmedImage = imageUrl?.trim();

  if (!trimmedTitle || !trimmedDescription || !categoryId || !price) {
    return { ok: false, error: "Missing required fields" };
  }

  if (trimmedTitle.length > LISTING_LIMITS.titleMax) {
    return { ok: false, error: `Title must be <= ${LISTING_LIMITS.titleMax} characters` };
  }

  if (trimmedDescription.length > LISTING_LIMITS.descriptionMax) {
    return { ok: false, error: `Description must be <= ${LISTING_LIMITS.descriptionMax} characters` };
  }

  if (trimmedLocation && trimmedLocation.length > LISTING_LIMITS.locationMax) {
    return { ok: false, error: `Location must be <= ${LISTING_LIMITS.locationMax} characters` };
  }

  const parsedCategoryId = Number.parseInt(categoryId, 10);
  const parsedPrice = Number.parseFloat(price);
  const parsedQuantity = quantity ? Number.parseInt(quantity, 10) : 1;

  if (!Number.isFinite(parsedCategoryId) || parsedCategoryId <= 0) {
    return { ok: false, error: "Invalid category" };
  }

  if (
    !Number.isFinite(parsedPrice) ||
    parsedPrice < LISTING_LIMITS.minPrice ||
    parsedPrice > LISTING_LIMITS.maxPrice
  ) {
    return {
      ok: false,
      error: `Price must be between ${LISTING_LIMITS.minPrice} and ${LISTING_LIMITS.maxPrice}`,
    };
  }

  if (
    !Number.isInteger(parsedQuantity) ||
    parsedQuantity < LISTING_LIMITS.minQuantity ||
    parsedQuantity > LISTING_LIMITS.maxQuantity
  ) {
    return {
      ok: false,
      error: `Quantity must be between ${LISTING_LIMITS.minQuantity} and ${LISTING_LIMITS.maxQuantity}`,
    };
  }

  return {
    ok: true,
    parsed: {
      title: trimmedTitle,
      description: trimmedDescription,
      categoryId: parsedCategoryId,
      price: parsedPrice,
      quantity: parsedQuantity,
      location: trimmedLocation || null,
      imageUrl: trimmedImage || null,
    },
  };
}

export function validateUpdateListingInput(input: UpdateInput): ValidationResult<ParsedBase> {
  const parsed: ParsedBase = {};

  if (input.title !== undefined) {
    if (typeof input.title !== "string" || !input.title.trim()) {
      return { ok: false, error: "Title cannot be empty" };
    }
    if (input.title.trim().length > LISTING_LIMITS.titleMax) {
      return { ok: false, error: `Title must be <= ${LISTING_LIMITS.titleMax} characters` };
    }
    parsed.title = input.title.trim();
  }

  if (input.description !== undefined) {
    if (typeof input.description !== "string" || !input.description.trim()) {
      return { ok: false, error: "Description cannot be empty" };
    }
    if (input.description.trim().length > LISTING_LIMITS.descriptionMax) {
      return { ok: false, error: `Description must be <= ${LISTING_LIMITS.descriptionMax} characters` };
    }
    parsed.description = input.description.trim();
  }

  if (input.location !== undefined) {
    if (input.location !== null && typeof input.location !== "string") {
      return { ok: false, error: "Location must be a string" };
    }
    if (input.location && input.location.trim().length > LISTING_LIMITS.locationMax) {
      return { ok: false, error: `Location must be <= ${LISTING_LIMITS.locationMax} characters` };
    }
    parsed.location = input.location?.trim() || null;
  }

  if (input.categoryId !== undefined) {
    const parsedCategoryId = Number.parseInt(input.categoryId, 10);
    if (!Number.isFinite(parsedCategoryId) || parsedCategoryId <= 0) {
      return { ok: false, error: "Invalid category" };
    }
    parsed.categoryId = parsedCategoryId;
  }

  if (input.price !== undefined) {
    const parsedPrice = Number.parseFloat(input.price);
    if (
      !Number.isFinite(parsedPrice) ||
      parsedPrice < LISTING_LIMITS.minPrice ||
      parsedPrice > LISTING_LIMITS.maxPrice
    ) {
      return {
        ok: false,
        error: `Price must be between ${LISTING_LIMITS.minPrice} and ${LISTING_LIMITS.maxPrice}`,
      };
    }
    parsed.price = parsedPrice;
  }

  if (input.quantity !== undefined) {
    const parsedQuantity = Number.parseInt(input.quantity, 10);
    if (
      !Number.isInteger(parsedQuantity) ||
      parsedQuantity < LISTING_LIMITS.minQuantity ||
      parsedQuantity > LISTING_LIMITS.maxQuantity
    ) {
      return {
        ok: false,
        error: `Quantity must be between ${LISTING_LIMITS.minQuantity} and ${LISTING_LIMITS.maxQuantity}`,
      };
    }
    parsed.quantity = parsedQuantity;
  }

  if (input.imageUrl !== undefined) {
    if (input.imageUrl !== null && typeof input.imageUrl !== "string") {
      return { ok: false, error: "Image URL must be a string" };
    }

    const trimmedUrl = input.imageUrl?.trim();
    if (trimmedUrl) {
      // Basic URL validation to prevent XSS/SSRF
      try {
        const url = new URL(trimmedUrl);
        // Only allow HTTP/HTTPS protocols
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          return { ok: false, error: "Image URL must use HTTP or HTTPS protocol" };
        }
        // Block dangerous protocols
        if (/^(javascript|data|file|vbscript|blob):/i.test(trimmedUrl)) {
          return { ok: false, error: "Invalid image URL protocol" };
        }
      } catch {
        return { ok: false, error: "Invalid image URL format" };
      }
    }

    parsed.imageUrl = trimmedUrl || null;
  }

  return { ok: true, parsed };
}
