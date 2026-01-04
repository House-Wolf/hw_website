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
    name: "Tactical Air Control Operations Division",
    subdivisions: ["TACOPS - Command", "TACOPS - Dire Wolfs", "TACOPS - Howlers"],
  },
  {
    name: "Special Operations Division",
    subdivisions: [
      "SPECOPS - Command",
      "SPECOPS - Wolfen",
      "SPECOPS - Medic",
      "SPECOPS - Inquisitor",
    ],
  },
  {
    name: "Logistics and Command Operations Division",
    subdivisions: [
      "LOCOPS - Command",
      "LOCOPS - Heavy Lift",
      "LOCOPS - Salvage",
      "LOCOPS - Mining",
      "LOCOPS - Engineer",
    ],
  },
  {
    name: "Advanced Research and Cartography Operations",
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
  const divisionSlug = normalizeKey(divisionName);

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

  return { division, subdivision };
}

/* =========================
   Server Action
========================= */

async function submitBio(formData: FormData) {
  "use server";

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

  const characterName = formData.get("characterName")?.toString().trim();
  const divisionName = formData.get("division")?.toString().trim();
  const subdivisionName = formData.get("subdivision")?.toString().trim() || null;
  const bio = formData.get("bio")?.toString().trim();
  const portraitUrl = formData.get("portraitUrl")?.toString().trim();

  if (!characterName || !divisionName || !bio) {
    throw new Error("Missing required fields.");
  }

  if (bio.length > 700) {
    throw new Error("Bio exceeds 700 characters.");
  }

  const roleNames = new Set(rolesRows.map((r) => r.name));

  const allowedDivisions = DIVISION_DEFINITIONS.map((division) => {
    const allowedSubs = division.subdivisions.filter((sub) =>
      roleNames.has(sub)
    );
    return { ...division, allowedSubs };
  }).filter((d) => d.allowedSubs.length > 0);

  const selectedDivision = allowedDivisions.find(
    (d) => d.name === divisionName
  );

  if (!selectedDivision) {
    throw new Error("Unauthorized division.");
  }

  if (subdivisionName && !selectedDivision.allowedSubs.includes(subdivisionName)) {
    throw new Error("Unauthorized subdivision.");
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
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const params = await searchParams;
  const submitted = params.submitted === "1";

  const profileRows = await prisma.$queryRaw<
    {
      characterName: string;
      bio: string;
      portraitUrl: string | null;
      divisionName: string | null;
      subdivisionName: string | null;
      status: string;
    }[]
  >`
    SELECT
      mp.character_name AS "characterName",
      mp.bio,
      mp.portrait_url AS "portraitUrl",
      d.name AS "divisionName",
      s.name AS "subdivisionName",
      mp.status::text AS status
    FROM mercenary_profiles mp
    LEFT JOIN divisions d ON d.id = mp.division_id
    LEFT JOIN subdivisions s ON s.id = mp.subdivision_id
    WHERE mp.user_id = ${session.user.id}::uuid
    LIMIT 1;
  `;

  const profile = profileRows[0] ?? null;
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
}
