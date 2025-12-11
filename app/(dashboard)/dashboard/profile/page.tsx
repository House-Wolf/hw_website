import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import MercenaryBioForm from "./components/MercenaryBioForm";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

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

  const characterName = (formData.get("characterName") as string)?.trim();
  const divisionName = (formData.get("division") as string)?.trim();
  const subdivisionName = (formData.get("subdivision") as string)?.trim();
  const bio = (formData.get("bio") as string)?.trim();
  const portraitUrl = (formData.get("portraitUrl") as string)?.trim();

  if (!characterName) throw new Error("Character name is required.");
  if (!divisionName) throw new Error("Division is required.");
  if (!bio) throw new Error("Bio is required.");
  if (bio.length > 700) throw new Error("Bio exceeds 700 characters.");

  const roleNames = new Set(rolesRows.map((r) => r.name));

  const allowedDivisions = DIVISION_DEFINITIONS.map((division) => {
    const allowedSubs = division.subdivisions.filter((sub) =>
      roleNames.has(sub)
    );
    return { ...division, allowedSubs };
  }).filter((division) => division.allowedSubs.length > 0);

  const selectedDivision = allowedDivisions.find(
    (div) => div.name === divisionName
  );

  if (!selectedDivision) {
    throw new Error("You are not allowed to submit for that division.");
  }

  if (subdivisionName) {
    const allowed = selectedDivision.allowedSubs.includes(subdivisionName);
    if (!allowed) {
      throw new Error("You are not allowed to submit for that subdivision.");
    }
  }

  const { division, subdivision } = await ensureDivisionAndSubs(
    divisionName,
    subdivisionName || null
  );

  const userId = session.user.id;

  const existingProfileRow = (await prisma.$queryRaw`
    SELECT id
    FROM mercenary_profiles
    WHERE user_id = ${userId}::uuid
    LIMIT 1;
  `) as Array<{ id: string }>;

  const finalPortraitUrl = portraitUrl || userRow.image || null;

  if (existingProfileRow.length) {
    const profileId = existingProfileRow[0].id;
    await prisma.$executeRaw`
      UPDATE mercenary_profiles
      SET
        character_name = ${characterName},
        bio = ${bio},
        division_id = ${division.id},
        subdivision_id = ${subdivision ? subdivision.id : null},
        status = 'PENDING',
        last_submitted_at = NOW(),
        updated_at = NOW(),
        approved_at = NULL,
        approved_by = NULL,
        rejected_at = NULL,
        rejected_by = NULL,
        rejection_reason = NULL,
        portrait_url = ${finalPortraitUrl}
      WHERE id = ${profileId}::uuid;
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
        status,
        is_public,
        last_submitted_at,
        updated_at,
        portrait_url
      )
      VALUES (
        gen_random_uuid(),
        ${userId}::uuid,
        ${characterName},
        ${bio},
        ${division.id},
        ${subdivision ? subdivision.id : null},
        'PENDING',
        true,
        NOW(),
        NOW(),
        ${finalPortraitUrl}
      );
    `;
  }

  redirect("/dashboard/profile?submitted=1");
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const [userRow] = (await prisma.$queryRaw`
    SELECT id, image
    FROM users
    WHERE id = ${session.user.id}::uuid
    LIMIT 1;
  `) as Array<{ id: string; image: string | null }>;

  if (!userRow) notFound();

  const rolesRows = (await prisma.$queryRaw`
    SELECT dr.name
    FROM user_roles ur
    JOIN discord_roles dr ON dr.id = ur.discord_role_id
    WHERE ur.user_id = ${session.user.id}::uuid;
  `) as Array<{ name: string }>;

  const profileRows = (await prisma.$queryRaw`
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
  `) as Array<{
    characterName: string;
    bio: string;
    portraitUrl: string | null;
    divisionName: string | null;
    subdivisionName: string | null;
    status: string;
  }>;

  const profile = profileRows[0] ?? null;
  const roleNames = new Set(rolesRows.map((r) => r.name));

  const allowedDivisions = DIVISION_DEFINITIONS.map((division) => {
    const allowedSubs = division.subdivisions.filter((sub) =>
      roleNames.has(sub)
    );
    return { ...division, allowedSubs };
  }).filter((division) => division.allowedSubs.length > 0);

  const hasAccess = allowedDivisions.length > 0;

  const params = await searchParams;
  const submitted = params?.submitted === "1";
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
      {/* Page header */}
      <div className="card border border-[var(--border-soft)] bg-[var(--background-secondary)]/80 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <p className="text-xs uppercase tracking-[0.15em] text-[var(--foreground-muted)]">
              Mercenary Bio
            </p>
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--foreground)] leading-tight">
              Mercenary Bio & Dossier
            </h1>
            <p className="text-sm text-[var(--foreground-muted)] max-w-2xl">
              Create your official House Wolf dossier. This profile powers the
              public Mercenaries page and helps leadership place you in the
              correct division and operations.
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-2">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {statusLabel}
            </span>
            <p className="text-[11px] text-[var(--foreground-muted)] max-w-[260px] text-right">
              Edits will resubmit your dossier for review if it&apos;s already
              approved or rejected.
            </p>
          </div>
        </div>
      </div>

      {submitted && (
        <div className="card border border-[var(--accent-soft)] bg-[var(--background-secondary)]/80">
          <p className="text-sm text-[var(--foreground)] font-semibold">
            Submission received. Your dossier is now pending review.
          </p>
          <p className="mt-1 text-xs text-[var(--foreground-muted)]">
            You can still make edits; changes will replace your previous
            submission.
          </p>
        </div>
      )}

      {!hasAccess ? (
        <div className="card border border-[var(--border-soft)] bg-[var(--background-secondary)]/80">
          <p className="text-sm text-[var(--foreground-muted)]">
            You do not have an eligible division role to submit a Mercenary Bio.
            If you think this is a mistake, contact an administrator.
          </p>
          <p className="text-xs text-[var(--foreground-muted)] mt-2">
            Eligible division roles are based on your Discord roles (e.g.,
            TACOPS / SPECOPS / LOCOPS / ARCOPS).
          </p>
        </div>
      ) : (
        <MercenaryBioForm
          allowedDivisions={allowedDivisions}
          onSubmit={submitBio}
          existingProfile={
            profile
              ? {
                  characterName: profile.characterName,
                  bio: profile.bio,
                  portraitUrl: profile.portraitUrl ?? undefined,
                  divisionName: profile.divisionName ?? undefined,
                  subdivisionName: profile.subdivisionName ?? undefined,
                }
              : null
          }
        />
      )}

      <div className="text-xs text-[var(--foreground-muted)]">
        Need to update your Discord roles? Visit the{" "}
        <Link
          href="https://discord.com"
          className="text-[var(--accent-main)] hover:underline"
        >
          Discord server
        </Link>{" "}
        or contact leadership.
      </div>
    </div>
  );
}
