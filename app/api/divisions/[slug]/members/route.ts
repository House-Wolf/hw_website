import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, RATE_LIMITS, getRateLimitIdentifier, getClientIp, createRateLimitHeaders } from "@/lib/rate-limit";

const COMMAND_RANKS = ["Captain", "Lieutenant", "Field Marshal", "Platoon Sergeant"];
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 150;

function isTransientPrismaError(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: string }).code;
    // Prisma P1001/P1002 are connection/timeout errors
    return code === "P1001" || code === "P1002";
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes("connect") || message.includes("timeout") || message.includes("terminated");
  }

  return false;
}

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(
  slug: string,
  label: string,
  operation: () => Promise<T>
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      console.warn("[Division API] transient failure", {
        slug,
        label,
        attempt,
        error: error instanceof Error ? { message: error.message, name: error.name } : error,
      });

      if (!isTransientPrismaError(error) || attempt === RETRY_ATTEMPTS) {
        throw error;
      }

      await wait(RETRY_DELAY_MS * attempt);
    }
  }

  throw lastError;
}

/**
 * GET /api/divisions/[slug]/members
 * Fetches all approved members for a specific division
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  let slug: string | undefined;

  try {
    // Rate limiting for division member queries
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

    // Extract and validate slug parameter (await params in Next.js 15+)
    const params = await context.params;
    slug = params?.slug;

    if (!slug || typeof slug !== 'string') {
      console.error("Invalid slug parameter:", { slug, params });
      return NextResponse.json(
        {
          error: "Invalid division slug",
          message: "Division slug parameter is required and must be a string"
        },
        { status: 400 }
      );
    }

    // Normalize slug (trim and lowercase)
    const normalizedSlug = slug.trim().toLowerCase();

    if (!normalizedSlug) {
      console.error("Empty slug after normalization:", { originalSlug: slug });
      return NextResponse.json(
        { error: "Invalid division slug", message: "Division slug cannot be empty" },
        { status: 400 }
      );
    }

    // SQL Injection Protection: Validate slug format
    // Only allow alphanumeric characters, hyphens, and underscores
    const SLUG_PATTERN = /^[a-z0-9_-]+$/i;
    if (!SLUG_PATTERN.test(normalizedSlug)) {
      console.error("Invalid slug format:", { slug: normalizedSlug });
      return NextResponse.json(
        { error: "Invalid division slug format" },
        { status: 400 }
      );
    }

    console.log(`[Division API] Fetching members for slug: "${normalizedSlug}"`);

    // Try to find division with exact match first (with retry for transient DB failures)
    let division = await withRetry(
      normalizedSlug,
      "findUnique",
      () =>
        prisma.division.findUnique({
          where: { slug: normalizedSlug },
          include: {
            mercenaryProfiles: {
              where: {
                status: "APPROVED",
                isPublic: true,
              },
              include: {
                rank: {
                  select: {
                    name: true,
                    sortOrder: true,
                    isLeadershipCore: true,
                    isOfficerCore: true,
                  }
                },
                subdivision: {
                  select: {
                    name: true,
                  }
                },
                user: {
                  select: {
                    discordUsername: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        })
    );

    // If not found, try case-insensitive search
    if (!division) {
      console.log(`[Division API] Exact match not found, trying case-insensitive search for: "${normalizedSlug}"`);

      division = await withRetry(
        normalizedSlug,
        "findFirst-insensitive",
        () =>
          prisma.division.findFirst({
            where: {
              slug: {
                equals: normalizedSlug,
                mode: 'insensitive'
              }
            },
            include: {
              mercenaryProfiles: {
                where: {
                  status: "APPROVED",
                  isPublic: true,
                },
                include: {
                  rank: {
                    select: {
                      name: true,
                      sortOrder: true,
                      isLeadershipCore: true,
                      isOfficerCore: true,
                    }
                  },
                  subdivision: {
                    select: {
                      name: true,
                    }
                  },
                  user: {
                    select: {
                      discordUsername: true,
                      avatarUrl: true,
                    },
                  },
                },
              },
            },
          })
      );
    }

    if (!division) {
      // Log detailed info server-side only (for debugging)
      console.error(`[Division API] Division not found:`, {
        requestedSlug: normalizedSlug,
        timestamp: new Date().toISOString(),
      });

      // Return generic error to client (prevent information disclosure)
      return NextResponse.json(
        {
          error: "Division not found",
          message: "The requested division does not exist."
        },
        { status: 404 }
      );
    }

    console.log(`[Division API] Found division: "${division.name}" with ${division.mercenaryProfiles.length} profiles`);

    // Transform and sort profiles
    const profiles = division.mercenaryProfiles.map((profile) => ({
      id: profile.id,
      characterName: profile.characterName,
      callSign: profile.call_sign,
      rank: profile.rank?.name || "Member",
      rankSortOrder: profile.rank?.sortOrder || 999,
      isLeadershipCore: profile.rank?.isLeadershipCore || false,
      isOfficerCore: profile.rank?.isOfficerCore || false,
      bio: profile.bio,
      portraitUrl: profile.portraitUrl || profile.user.avatarUrl || null,
      subdivisionName: profile.subdivision?.name || null,
      discordUsername: profile.user.discordUsername,
    }));

    // Separate into three groups: leadership command, officers, and regular members
    const commandRoster = profiles
      .filter((p) => p.isLeadershipCore || COMMAND_RANKS.includes(p.rank))
      .sort((a, b) => a.rankSortOrder - b.rankSortOrder);

    const officers = profiles
      .filter((p) => !p.isLeadershipCore && !COMMAND_RANKS.includes(p.rank) && p.isOfficerCore)
      .sort((a, b) => a.rankSortOrder - b.rankSortOrder);

    const members = profiles
      .filter((p) => !p.isLeadershipCore && !COMMAND_RANKS.includes(p.rank) && !p.isOfficerCore)
      .sort((a, b) => a.rankSortOrder - b.rankSortOrder);

    return NextResponse.json({
      division: {
        name: division.name,
        slug: division.slug,
        description: division.description,
      },
      commandRoster,
      officers,
      members,
    });
  } catch (error) {
    // Log detailed errors server-side only (don't expose to client)
    console.error("[Division API] Error fetching division members:", {
      slug: slug || 'undefined',
      timestamp: new Date().toISOString(),
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      // Don't log full stack trace or sensitive details
    });

    // Check if it's a database connection error
    if (error instanceof Error) {
      if (error.message.includes('connect') || error.message.includes('timeout')) {
        return NextResponse.json(
          {
            error: "Database connection failed",
            message: "Unable to connect to database. Please try again later.",
            retryable: true,
          },
          { status: 503 }
        );
      }

      if (error.message.includes('permission') || error.message.includes('denied')) {
        return NextResponse.json(
          {
            error: "Database permission error",
            message: "Database access denied. Please contact support.",
            retryable: false,
          },
          { status: 500 }
        );
      }
    }

    // Generic error response (don't expose internal details)
    return NextResponse.json(
      {
        error: "Failed to fetch division members",
        message: "An error occurred while retrieving division data. Please try again later.",
      },
      { status: 500 }
    );
  }
}
