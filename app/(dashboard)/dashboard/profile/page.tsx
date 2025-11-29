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
    subdivisions: [
      "Leadership Core",
      "Officers",
      "Non-Commissioned Officers",
    ],
  },
  {
    name: "Tactical Air Control Operations Division",
    subdivisions: [
      "TACOPS - Command",
      "TACOPS - Dire Wolfs",
      "TACOPS - Howlers",
    ],
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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      roles: {
        include: { discordRole: true },
      },
    },
  });

  if (!user) redirect("/auth/signin");

  const characterName = (formData.get("characterName") as string)?.trim();
  const divisionName = (formData.get("division") as string)?.trim();
  const subdivisionName = (formData.get("subdivision") as string)?.trim();
  const bio = (formData.get("bio") as string)?.trim();

  if (!characterName) throw new Error("Character name is required.");
  if (!divisionName) throw new Error("Division is required.");
  if (!bio) throw new Error("Bio is required.");
  if (bio.length > 700) throw new Error("Bio exceeds 700 characters.");

  const roleNames = new Set(user.roles.map((r) => r.discordRole.name));

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

  const existingProfile = await prisma.mercenaryProfile.findFirst({
    where: { userId: user.id },
  });

  if (existingProfile) {
    await prisma.mercenaryProfile.update({
      where: { id: existingProfile.id },
      data: {
        characterName,
        bio,
        divisionId: division.id,
        subdivisionId: subdivision ? subdivision.id : null,
        status: "PENDING",
        lastSubmittedAt: new Date(),
        approvedAt: null,
        approvedBy: null,
        rejectedAt: null,
        rejectedBy: null,
        rejectionReason: null,
        portraitUrl: user.image ?? null,
      },
    });
  } else {
    await prisma.mercenaryProfile.create({
      data: {
        userId: user.id,
        characterName,
        bio,
        divisionId: division.id,
        subdivisionId: subdivision ? subdivision.id : null,
        status: "PENDING",
        isPublic: true,
        lastSubmittedAt: new Date(),
        portraitUrl: user.image ?? null,
      },
    });
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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      roles: { include: { discordRole: true } },
      mercenaryProfiles: true,
    },
  });

  if (!user) notFound();

  const roleNames = new Set(user.roles.map((r) => r.discordRole.name));

  const allowedDivisions = DIVISION_DEFINITIONS.map((division) => {
    const allowedSubs = division.subdivisions.filter((sub) =>
      roleNames.has(sub)
    );
    return { ...division, allowedSubs };
  }).filter((division) => division.allowedSubs.length > 0);

  const hasAccess = allowedDivisions.length > 0;

  const params = await searchParams;
  const submitted = params?.submitted === "1";

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.1em] text-[var(--foreground-muted)]">
              Mercenary Bio
            </p>
            <h1 className="text-2xl font-bold text-[var(--foreground)] leading-tight">
              Mercenary Bio Upload
            </h1>
            <p className="text-sm text-[var(--foreground-muted)]">
              Give fellow Dragoons a face and a story. These entries power the
              "Mercenaries" section on the public site.
            </p>
          </div>
          <div className="hidden sm:block text-xs text-[var(--foreground-muted)]">
            Max bio length: 700 characters
          </div>
        </div>
      </div>

      {submitted && (
        <div className="card border border-[var(--accent-soft)] bg-[var(--background-secondary)]/70">
          <p className="text-sm text-[var(--foreground)] font-semibold">
            Submission received. Your dossier is now pending review.
          </p>
        </div>
      )}

      {!hasAccess ? (
        <div className="card border border-[var(--border-soft)] bg-[var(--background-secondary)]/70">
          <p className="text-sm text-[var(--foreground-muted)]">
            You do not have an eligible division role to submit a Mercenary Bio.
            If you think this is a mistake, contact an administrator.
          </p>
          <p className="text-xs text-[var(--foreground-muted)] mt-2">
            Eligible division roles are based on your Discord roles (e.g., TACOPS
            / SPECOPS / LOCOPS / ARCOPS).
          </p>
        </div>
      ) : (
        <MercenaryBioForm
          allowedDivisions={allowedDivisions}
          onSubmit={submitBio}
          existingProfile={user.mercenaryProfiles[0] ?? null}
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
