import { NextRequest, NextResponse } from "next/server";
import { rateLimit, RATE_LIMITS, getRateLimitIdentifier, getClientIp, createRateLimitHeaders } from "@/lib/rate-limit";
import { getDivisionRoster } from "@/lib/divisions/getDivisionsRoster";
import { DIVISIONS } from "@/lib/divisions/divisionConfig";
/**
 * GET /api/divisions/[slug]/members
 * Returns the roster for a specific division
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  let slug: string | undefined;

  try {
    /* ----------------------------- */
    /* Rate limiting                 */
    /* ----------------------------- */
    const identifier = getRateLimitIdentifier(
      null,
      getClientIp(request.headers)
    );

    const rateLimitResult = await rateLimit(identifier, RATE_LIMITS.API_READ);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult),
        }
      );
    }

    /* ----------------------------- */
    /* Extract & validate slug       */
    /* ----------------------------- */
    const params = await context.params;
    slug = params?.slug;

    if (!slug || typeof slug !== "string") {
      return NextResponse.json(
        { error: "Invalid division slug" },
        { status: 400 }
      );
    }

    const normalizedSlug = slug.trim().toLowerCase();

    if (!normalizedSlug) {
      return NextResponse.json(
        { error: "Division slug cannot be empty" },
        { status: 400 }
      );
    }

    const SLUG_PATTERN = /^[a-z0-9_-]+$/;
    if (!SLUG_PATTERN.test(normalizedSlug)) {
      return NextResponse.json(
        { error: "Invalid division slug format" },
        { status: 400 }
      );
    }

    /* ----------------------------- */
    /* Canonical division validation */
    /* ----------------------------- */
    if (!(normalizedSlug in DIVISIONS)) {
      return NextResponse.json(
        { error: "Division not found" },
        { status: 404 }
      );
    }

    /* ----------------------------- */
    /* Single source of truth        */
    /* ----------------------------- */
    const data = await getDivisionRoster(
      normalizedSlug as keyof typeof DIVISIONS
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error("[Division API] Failed to fetch division roster", {
      slug: slug ?? "undefined",
      errorType: error instanceof Error ? error.name : typeof error,
    });

    return NextResponse.json(
      {
        error: "Failed to fetch division members",
        message: "An error occurred while retrieving division data.",
      },
      { status: 500 }
    );
  }
}
