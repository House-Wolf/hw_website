import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import MercenaryBioForm from "./components/MercenaryBioForm";
import { deriveRankFromRoles } from "@/lib/ranks/deriveRankFromRoles";

/* =========================
   Division Definitions
========================= */

const DIVISION_DEFINITIONS = [
  {
    name: "House Wolf Command",
    subdivisions: ["Leadership Core", "Officers", "Non-Commissioned Officers"],
  },
  {
    name: "TACOPS",
    subdivisions: ["TACOPS - Command", "TACOPS - Dire Wolfs", "TACOPS - Howlers"],
  },
  {
    name: "SPECOPS",
    subdivisions: [
      "SPECOPS - Command",
      "SPECOPS - Wolfen",
      "SPECOPS - Medic",
      "SPECOPS - Inquisitor",
    ],
  },
  {
    name: "LOCOPS",
    subdivisions: [
      "LOCOPS - Command",
      "LOCOPS - Heavy Lift",
      "LOCOPS - Salvage",
      "LOCOPS - Mining",
      "LOCOPS - Engineer",
    ],
  },
  {
    name: "ARCOPS",
    subdivisions: [
      "ARCOPS - Command",
      "ARCOPS - Chimeras",
      "ARCOPS - Wayfinders",
      "ARCOPS - Replicators",
    ],
  },
];

/* =========================
   Helpers
========================= */

function normalizeKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function ensureDivisionAndSubs(
  divisionName: string,
  subdivisionName: string | null
) {
  try {
    const divisionSlug = normalizeKey(divisionName);

    if (!divisionSlug) {
      throw new Error(`Invalid division name: ${divisionName}`);
    }

    const division = await prisma.division.upsert({
      where: { slug: divisionSlug },
      create: {
        name: divisionName,
        slug: divisionSlug,
        description: divisionName,
        isActive: true,
        sortOrder: 0,
      },
      update: {
        name: divisionName,
        description: divisionName,
        isActive: true,
      },
      include: { subdivisions: true },
    });

    let subdivision = null;

    if (subdivisionName) {
      const subdivisionSlug = normalizeKey(subdivisionName);

      if (!subdivisionSlug) {
        throw new Error(`Invalid subdivision name: ${subdivisionName}`);
      }

      subdivision = await prisma.subdivision.upsert({
        where: { slug: subdivisionSlug },
        create: {
          name: subdivisionName,
          slug: subdivisionSlug,
          description: subdivisionName,
          divisionId: division.id,
          isActive: true,
          sortOrder: 0,
        },
        update: {
          name: subdivisionName,
          description: subdivisionName,
          isActive: true,
          divisionId: division.id,
        },
      });
    }

    console.log("[ensureDivisionAndSubs] Success", {
      divisionName,
      divisionId: division.id,
      subdivisionName,
      subdivisionId: subdivision?.id,
    });

    return { division, subdivision };
  } catch (error) {
    console.error("[ensureDivisionAndSubs] Failed", {
      divisionName,
      subdivisionName,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/* =========================
   Server Action
========================= */

async function submitBio(formData: FormData) {
  "use server";

  try {
    const session = await auth();
    if (!session?.user) redirect("/auth/signin");

    const [userRow] = (await prisma.$queryRaw`
      SELECT id, image
      FROM users
      WHERE id = ${session.user.id}::uuid
      LIMIT 1;
    `) as Array<{ id: string; image: string | null }>;

    if (!userRow) redirect("/auth/signin");

  const rolesRows = (await prisma.$queryRaw`
    SELECT dr.name
    FROM user_roles ur
    JOIN discord_roles dr ON dr.id = ur.discord_role_id
    WHERE ur.user_id = ${session.user.id}::uuid;
  `) as Array<{ name: string }>;

  const characterName = formData.get("characterName")?.toString()?.trim();
  const divisionName = formData.get("division")?.toString()?.trim();
  const subdivisionName = formData.get("subdivision")?.toString()?.trim() || null;
  const bio = formData.get("bio")?.toString()?.trim();
  const portraitUrl = formData.get("portraitUrl")?.toString()?.trim();

  if (!characterName || !divisionName || !bio) {
    throw new Error("Missing required fields.");
  }

  if (bio.length > 700) {
    throw new Error("Bio exceeds 700 characters.");
  }

  const roleNames = new Set(rolesRows.map((r) => r.name));

  console.log("[submitBio] User roles", {
    userId: session.user.id,
    roleCount: roleNames.size,
    roles: Array.from(roleNames),
  });

  const allowedDivisions = DIVISION_DEFINITIONS.map((division) => {
    const allowedSubs = division.subdivisions.filter((sub) =>
      roleNames.has(sub)
    );
    return { ...division, allowedSubs };
  }).filter((d) => d.allowedSubs.length > 0);

  console.log("[submitBio] Allowed divisions", {
    userId: session.user.id,
    attemptedDivision: divisionName,
    attemptedSubdivision: subdivisionName,
    allowedDivisionCount: allowedDivisions.length,
    allowedDivisions: allowedDivisions.map(d => ({ name: d.name, subs: d.allowedSubs })),
  });

  const selectedDivision = allowedDivisions.find(
    (d) => d.name === divisionName
  );

  if (!selectedDivision) {
    console.error("[submitBio] Unauthorized division attempt", {
      userId: session.user.id,
      attemptedDivision: divisionName,
      userRoles: Array.from(roleNames),
      availableDivisions: allowedDivisions.map(d => d.name),
    });

    throw new Error(
      `You don't have the required Discord role to join ${divisionName}. ` +
      `Please ensure you have one of the subdivision roles assigned in Discord, then sign out and sign back in to refresh your permissions.`
    );
  }

  if (subdivisionName && !selectedDivision.allowedSubs.includes(subdivisionName)) {
    console.error("[submitBio] Unauthorized subdivision attempt", {
      userId: session.user.id,
      attemptedSubdivision: subdivisionName,
      allowedSubdivisions: selectedDivision.allowedSubs,
    });

    throw new Error(
      `You don't have the required Discord role for ${subdivisionName}. ` +
      `Available subdivisions: ${selectedDivision.allowedSubs.join(", ")}`
    );
  }

  const { division, subdivision } = await ensureDivisionAndSubs(
    divisionName,
    subdivisionName
  );

  const existing = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM mercenary_profiles
    WHERE user_id = ${session.user.id}::uuid
    LIMIT 1;
  `;

  const finalPortraitUrl = portraitUrl || userRow.image || null;

  // 🔑 Automatically derive rank from Discord roles
  const rankId = await deriveRankFromRoles(Array.from(roleNames));

  if (existing.length) {
    if (rankId !== null) {
      await prisma.$executeRaw`
        UPDATE mercenary_profiles
        SET
          character_name = ${characterName},
          bio = ${bio},
          division_id = ${division.id},
          subdivision_id = ${subdivision?.id ?? null},
          portrait_url = ${finalPortraitUrl},
          rank_id = ${rankId},
          status = 'PENDING',
          updated_at = NOW(),
          last_submitted_at = NOW()
        WHERE id = ${existing[0].id}::uuid;
      `;
    } else {
      await prisma.$executeRaw`
        UPDATE mercenary_profiles
        SET
          character_name = ${characterName},
          bio = ${bio},
          division_id = ${division.id},
          subdivision_id = ${subdivision?.id ?? null},
          portrait_url = ${finalPortraitUrl},
          rank_id = NULL,
          status = 'PENDING',
          updated_at = NOW(),
          last_submitted_at = NOW()
        WHERE id = ${existing[0].id}::uuid;
      `;
    }
  } else {
    if (rankId !== null) {
      await prisma.$executeRaw`
        INSERT INTO mercenary_profiles (
          id,
          user_id,
          character_name,
          bio,
          division_id,
          subdivision_id,
          portrait_url,
          rank_id,
          status,
          is_public,
          created_at,
          updated_at,
          last_submitted_at
        )
        VALUES (
          gen_random_uuid(),
          ${session.user.id}::uuid,
          ${characterName},
          ${bio},
          ${division.id},
          ${subdivision?.id ?? null},
          ${finalPortraitUrl},
          ${rankId},
          'PENDING',
          true,
          NOW(),
          NOW(),
          NOW()
        );
      `;
    } else {
      await prisma.$executeRaw`
        INSERT INTO mercenary_profiles (
          id,
          user_id,
          character_name,
          bio,
          division_id,
          subdivision_id,
          portrait_url,
          rank_id,
          status,
          is_public,
          created_at,
          updated_at,
          last_submitted_at
        )
        VALUES (
          gen_random_uuid(),
          ${session.user.id}::uuid,
          ${characterName},
          ${bio},
          ${division.id},
          ${subdivision?.id ?? null},
          ${finalPortraitUrl},
          NULL,
          'PENDING',
          true,
          NOW(),
          NOW(),
          NOW()
        );
      `;
    }
  }

    redirect("/dashboard/profile?submitted=1");
  } catch (error) {
    console.error("[submitBio] Profile submission failed", {
      userId: (await auth())?.user?.id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
      throw error;
    }

    throw new Error(
      error instanceof Error ? error.message : "Failed to submit profile. Please try again."
    );
  }
}

/* =========================
   Page Component
========================= */

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      console.error("[ProfilePage] No session or user ID");
      redirect("/auth/signin");
    }

    const params = await searchParams;
    const submitted = params.submitted === "1";

    // Use Prisma's type-safe query instead of raw SQL
    let profile = null;
    try {
      const profileData = await prisma.mercenaryProfile.findFirst({
        where: {
          userId: session.user.id,
        },
        include: {
          division: {
            select: { name: true },
          },
          subdivision: {
            select: { name: true },
          },
        },
      });

      if (profileData) {
        profile = {
          characterName: profileData.characterName,
          bio: profileData.bio,
          portraitUrl: profileData.portraitUrl,
          divisionName: profileData.division?.name ?? null,
          subdivisionName: profileData.subdivision?.name ?? null,
          status: profileData.status,
        };
      }
    } catch (error) {
      console.error("[ProfilePage] Failed to fetch profile", {
        userId: session.user.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new Error("Failed to load profile. Please try again later.");
    }

    const status = profile?.status ?? null;

    const statusLabel =
      status === "APPROVED"
        ? "Approved"
        : status === "REJECTED"
        ? "Rejected"
        : status === "PENDING"
        ? "Pending review"
        : "Not submitted";

    const statusClasses =
      status === "APPROVED"
        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
        : status === "REJECTED"
        ? "bg-rose-500/15 text-rose-300 border-rose-500/40"
        : status === "PENDING"
        ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/40"
        : "bg-[var(--background-secondary)]/80 text-[var(--foreground-muted)] border-[var(--border-soft)]";

    return (
    <div className="space-y-6 max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="card border border-[var(--border-soft)] bg-[var(--background-secondary)]/80 p-6 md:p-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-bold">Mercenary Bio</h1>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold border ${statusClasses}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      {submitted && (
        <div className="card border border-[var(--accent-soft)] bg-[var(--background-secondary)]/80">
          Submission received. Your dossier is pending review.
        </div>
      )}

      <MercenaryBioForm
        allowedDivisions={DIVISION_DEFINITIONS.map((d) => ({
          ...d,
          allowedSubs: d.subdivisions,
        }))}
        onSubmit={submitBio}
        existingProfile={
          profile
            ? {
                ...profile,
                divisionName: profile.divisionName ?? undefined,
                subdivisionName: profile.subdivisionName ?? undefined,
              }
            : null
        }
      />

      <div className="text-xs text-[var(--foreground-muted)]">
        Need to update your Discord roles?{" "}
        <Link href="https://discord.com" className="text-[var(--accent-main)] hover:underline">
          Visit Discord
        </Link>
      </div>
    </div>
    );
  } catch (error) {
    console.error("[ProfilePage] Unexpected error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Re-throw redirects
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
      throw error;
    }

    // Show user-friendly error
    throw new Error(
      error instanceof Error
        ? error.message
        : "An unexpected error occurred while loading the profile page."
    );
  }
}
