import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { deriveUserPermissions } from "@/lib/derive-permissions";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Ban, CheckCircle2, FileText, Shield, UserCog, Link2 } from "lucide-react";
import ApprovedDossiersSection from "./components/ApprovedDossiersSection";
import SocialLinksSection from "./components/SocialLinksSection";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";



async function suspendUserAction(formData: FormData) {
  "use server";

  const session = await auth();
  if (
    !session?.user ||
    !session.user.permissions.includes(PERMISSIONS.SITE_ADMIN)
  ) {
    redirect("/dashboard");
  }

  const userId = formData.get("userId");

  if (!userId || typeof userId !== "string") {
    throw new Error("Invalid user");
  }

  if (userId === session.user.id) {
    throw new Error("You cannot suspend yourself.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      isActive: false,
    },
  });

  redirect("/dashboard/admin");
}

async function reinstateUserAction(formData: FormData) {
  "use server";

  const session = await auth();
  if (
    !session?.user ||
    !session.user.permissions.includes(PERMISSIONS.SITE_ADMIN)
  ) {
    redirect("/dashboard");
  }

  const userId = formData.get("userId");

  if (!userId || typeof userId !== "string") {
    throw new Error("Invalid user");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      isActive: true,
    },
  });

  redirect("/dashboard/admin");
}

async function approveDossierAction(formData: FormData) {
  "use server";

  const session = await auth();
  if (
    !session?.user ||
    !session.user.permissions.includes(PERMISSIONS.DOSSIER_ADMIN)
  ) {
    redirect("/dashboard");
  }

  const dossierId = formData.get("dossierId");
  if (!dossierId || typeof dossierId !== "string") {
    throw new Error("Invalid dossier");
  }

  await prisma.mercenaryProfile.update({
    where: { id: dossierId },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      approvedBy: session.user.id,
      rejectedAt: null,
      rejectedBy: null,
      rejectionReason: null,
    },
  });

  redirect("/dashboard/admin?tab=dossiers");
}

async function revertDossierAction(formData: FormData) {
  "use server";

  const session = await auth();
  if (
    !session?.user ||
    !session.user.permissions.includes(PERMISSIONS.DOSSIER_ADMIN)
  ) {
    redirect("/dashboard");
  }

  const dossierId = formData.get("dossierId");
  if (!dossierId || typeof dossierId !== "string") {
    throw new Error("Invalid dossier");
  }

  await prisma.mercenaryProfile.update({
    where: { id: dossierId },
    data: {
      status: "PENDING",
      approvedAt: null,
      approvedBy: null,
    },
  });

  redirect("/dashboard/admin?tab=dossiers");
}

async function editDossierAction(formData: FormData) {
  "use server";

  const session = await auth();
  if (
    !session?.user ||
    !session.user.permissions.includes(PERMISSIONS.DOSSIER_ADMIN)
  ) {
    redirect("/dashboard");
  }

  const dossierId = formData.get("dossierId");
  const characterName = formData.get("characterName");
  const bio = formData.get("bio");
  const divisionId = formData.get("divisionId");
  const subdivisionId = formData.get("subdivisionId");

  if (!dossierId || typeof dossierId !== "string") {
    throw new Error("Invalid dossier");
  }
  if (!characterName || typeof characterName !== "string") {
    throw new Error("Character name is required");
  }
  if (!bio || typeof bio !== "string") {
    throw new Error("Bio is required");
  }
  if (!divisionId || typeof divisionId !== "string") {
    throw new Error("Division is required");
  }

  await prisma.mercenaryProfile.update({
    where: { id: dossierId },
    data: {
      characterName: characterName.trim(),
      bio: bio.trim(),
      divisionId: parseInt(divisionId),
      subdivisionId: subdivisionId && subdivisionId !== "" ? parseInt(subdivisionId as string) : null,
    },
  });

  redirect("/dashboard/admin?tab=dossiers");
}

async function deleteDossierAction(formData: FormData) {
  "use server";

  const session = await auth();
  if (
    !session?.user ||
    !session.user.permissions.includes(PERMISSIONS.DOSSIER_ADMIN)
  ) {
    redirect("/dashboard");
  }

  const dossierId = formData.get("dossierId");
  if (!dossierId || typeof dossierId !== "string") {
    throw new Error("Invalid dossier");
  }

  await prisma.mercenaryProfile.delete({
    where: { id: dossierId },
  });

  redirect("/dashboard/admin?tab=dossiers");
}

export default async function AdminPanelPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();

  const hasUserAdmin = !!session?.user?.permissions.includes(PERMISSIONS.SITE_ADMIN);
  const hasDossierAdmin = !!session?.user?.permissions.includes(PERMISSIONS.DOSSIER_ADMIN);

  if (!session?.user || (!hasUserAdmin && !hasDossierAdmin)) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const requestedTab =
    typeof params?.tab === "string" ? (params.tab as string) : "users";
  let activeTab: "users" | "dossiers" | "social" = "users";
  if (requestedTab === "dossiers" && hasDossierAdmin) {
    activeTab = "dossiers";
  } else if (requestedTab === "social" && hasDossierAdmin) {
    activeTab = "social";
  } else if (!hasUserAdmin && hasDossierAdmin) {
    activeTab = "dossiers";
  }

  const users = hasUserAdmin
    ? await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          roles: {
            include: {
              discordRole: {
                include: {
                  permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
          _count: {
            select: {
              marketplaceListings: true,
            },
          },
          marketplaceStatus: true,
        },
      })
    : [];

  const dossiers = hasDossierAdmin
    ? ((await prisma.$queryRaw`
        SELECT
          mp.id,
          mp.user_id AS "userId",
          mp.character_name AS "characterName",
          mp.bio,
          mp.division_id AS "divisionId",
          mp.subdivision_id AS "subdivisionId",
          mp.status::text AS status,
          mp.last_submitted_at AS "lastSubmittedAt",
          mp.approved_at AS "approvedAt",
          mp.rejected_at AS "rejectedAt",
          mp.rejection_reason AS "rejectionReason",
          COALESCE(u.discord_display_name, u.discord_username) AS "displayName",
          u.discord_username AS "discordUsername",
          d.name AS "divisionName",
          s.name AS "subdivisionName"
        FROM mercenary_profiles mp
        LEFT JOIN users u ON u.id = mp.user_id
        LEFT JOIN divisions d ON d.id = mp.division_id
        LEFT JOIN subdivisions s ON s.id = mp.subdivision_id
        ORDER BY mp.last_submitted_at DESC NULLS LAST;
      `) as Array<{
        id: string;
        userId: string;
        characterName: string;
        bio: string;
        divisionId: number | null;
        subdivisionId: number | null;
        status: string;
        lastSubmittedAt: Date | null;
        approvedAt: Date | null;
        rejectedAt: Date | null;
        rejectionReason: string | null;
        displayName: string | null;
        discordUsername: string | null;
        divisionName: string | null;
        subdivisionName: string | null;
      }>)
    : [];

  const divisions = hasDossierAdmin
    ? await prisma.division.findMany({
        orderBy: { sortOrder: "asc" },
      })
    : [];

  const subdivisions = hasDossierAdmin
    ? await prisma.subdivision.findMany({
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          
          divisionId: true,
        },
      })
    : [];

  const approvedDossiers = dossiers
    .filter((d) => d.status === "APPROVED")
    .map((d) => ({
      ...d,
      user: { discordUsername: d.discordUsername || "unknown" },
      division: d.divisionName ? { name: d.divisionName } : null,
      subdivision: d.subdivisionName ? { name: d.subdivisionName } : null,
    }));

  return (
    <div className="space-y-6">
      <div className="card border border-[var(--border-soft)] bg-[var(--background-secondary)]/70">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-full bg-[var(--accent-strong)]/15 border border-[var(--border)] flex items-center justify-center">
            <Shield className="text-[var(--accent-strong)]" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)] leading-tight">
              Admin Panel
            </h1>
            <p className="text-sm text-[var(--foreground-muted)]">
              Manage dossiers, divisions, users, suspensions, and audit logs.
            </p>
          </div>
        </div>
      </div>

      <section className="card space-y-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-soft)] pb-3">
          <Link
            href="/dashboard/admin?tab=users"
            className={`px-3 py-2 rounded-md text-sm font-semibold border cursor-pointer ${
              activeTab === "users"
                ? "bg-[var(--accent-strong)]/15 border-[var(--accent-strong)] text-[var(--foreground)]"
                : "border-[var(--border-soft)] text-[var(--foreground-muted)] bg-[var(--background-secondary)]/60"
            } ${!hasUserAdmin ? "pointer-events-none opacity-50" : ""}`}
            aria-current={activeTab === "users" ? "page" : undefined}
            aria-disabled={!hasUserAdmin}
          >
            User Management
          </Link>
          <Link
            href="/dashboard/admin?tab=dossiers"
            className={`px-3 py-2 rounded-md text-sm font-semibold border cursor-pointer ${
              activeTab === "dossiers"
                ? "bg-[var(--accent-strong)]/15 border-[var(--accent-strong)] text-[var(--foreground)]"
                : "border-[var(--border-soft)] text-[var(--foreground-muted)] bg-[var(--background-secondary)]/60"
            } ${!hasDossierAdmin ? "pointer-events-none opacity-50" : ""}`}
            aria-current={activeTab === "dossiers" ? "page" : undefined}
            aria-disabled={!hasDossierAdmin}
          >
            Dossiers
          </Link>
          <Link
            href="/dashboard/admin?tab=social"
            className={`px-3 py-2 rounded-md text-sm font-semibold border cursor-pointer ${
              activeTab === "social"
                ? "bg-[var(--accent-strong)]/15 border-[var(--accent-strong)] text-[var(--foreground)]"
                : "border-[var(--border-soft)] text-[var(--foreground-muted)] bg-[var(--background-secondary)]/60"
            } ${!hasDossierAdmin ? "pointer-events-none opacity-50" : ""}`}
            aria-current={activeTab === "social" ? "page" : undefined}
            aria-disabled={!hasDossierAdmin}
          >
            Social Links
          </Link>
        </div>

        {activeTab === "users" && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.1em] text-[var(--foreground-muted)]">
                  Admin Toolkit
                </p>
                <h2 className="text-lg font-semibold text-[var(--foreground)]">
                  User Management
                </h2>
                <p className="text-sm text-[var(--foreground-muted)]">
                  Review user access, site permissions, and marketplace activity.
                </p>
              </div>
              <UserCog className="text-[var(--accent-main)]" size={20} />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--foreground-muted)] border-b border-[var(--border-soft)]">
                    <th className="py-2 pr-4 font-semibold">User</th>
                    <th className="py-2 pr-4 font-semibold">Permissions</th>
                    <th className="py-2 pr-4 font-semibold whitespace-nowrap">Listings</th>
                    <th className="py-2 pr-4 font-semibold">Status</th>
                    <th className="py-2 pr-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-soft)]">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-[var(--foreground-muted)]">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => {
                      // Use centralized permission derivation logic
                      const permissionSet = deriveUserPermissions(user.roles);
                      const permissions = Array.from(permissionSet);

                      const status = user.isActive ? "Active" : "Suspended";
                      const statusIcon = user.isActive ? (
                        <CheckCircle2 size={16} className="text-[var(--accent-soft)]" />
                      ) : (
                        <Ban size={16} className="text-[var(--accent-strong)]" />
                      );

                      return (
                        <tr key={user.id} className="align-top">
                          <td className="py-3 pr-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-[var(--foreground)]">
                                {user.discordDisplayName || user.name || user.discordUsername}
                              </span>
                              <span className="text-xs text-[var(--foreground-muted)]">
                                @{user.discordUsername}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            {permissions.length === 0 ? (
                              <span className="text-xs text-[var(--foreground-muted)]">
                                None
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {permissions.map((permission) => (
                                  <span
                                    key={permission}
                                    className="px-2 py-1 rounded-full bg-[var(--background-elevated)] border border-[var(--border-soft)] text-[var(--foreground)] text-xs font-semibold"
                                  >
                                    {permission}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="py-3 pr-4 whitespace-nowrap">
                            <span className="font-semibold text-[var(--foreground)]">
                              {user._count.marketplaceListings}
                            </span>
                            <span className="text-xs text-[var(--foreground-muted)] ml-1">
                              listings
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="inline-flex items-center gap-2 px-2 py-1 rounded-md border border-[var(--border-soft)] bg-[var(--background-secondary)]/60">
                              {statusIcon}
                              <span className="text-sm text-[var(--foreground)] font-semibold">
                                {status}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            {user.isActive ? (
                              <form action={suspendUserAction}>
                                <input type="hidden" name="userId" value={user.id} />
                                <button
                                  type="submit"
                                  className="px-3 py-1.5 rounded-md text-xs font-semibold border border-[var(--border)] bg-[var(--background-elevated)] hover:bg-[var(--accent-strong)]/15 hover:border-[var(--accent-strong)] transition-colors text-[var(--foreground)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                  aria-label="Suspend user"
                                  title="Suspend user from dashboard access"
                                >
                                  Suspend
                                </button>
                              </form>
                            ) : (
                              <form action={reinstateUserAction}>
                                <input type="hidden" name="userId" value={user.id} />
                                <button
                                  type="submit"
                                  className="px-3 py-1.5 rounded-md text-xs font-semibold border border-[var(--accent-soft)] bg-[var(--background-elevated)] hover:bg-[var(--accent-soft)]/15 hover:border-[var(--accent-soft)] transition-colors text-[var(--foreground)] cursor-pointer"
                                  aria-label="Revoke suspension"
                                  title="Revoke suspension and restore access"
                                >
                                  Revoke Suspension
                                </button>
                              </form>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === "dossiers" && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.1em] text-[var(--foreground-muted)]">
                  Dossier Workflow
                </p>
                <h2 className="text-lg font-semibold text-[var(--foreground)]">
                  Mercenary Bios
                </h2>
                <p className="text-sm text-[var(--foreground-muted)]">
                  Review and approve submitted bios from Dragoons.
                </p>
              </div>
              <FileText className="text-[var(--accent-main)]" size={20} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="border border-[var(--border-soft)] rounded-lg p-4 bg-[var(--background-secondary)]/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
                      Pending Dossiers
                    </p>
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">
                      Awaiting Approval
                    </h3>
                  </div>
                  <span className="text-sm font-semibold px-3 py-1 rounded-full bg-[var(--accent-strong)]/15 border border-[var(--accent-strong)] text-[var(--foreground)]">
                    {dossiers.filter((d) => d.status === "PENDING").length}
                  </span>
                </div>

                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {dossiers.filter((d) => d.status === "PENDING").length === 0 ? (
                    <p className="text-sm text-[var(--foreground-muted)]">
                      No pending dossiers.
                    </p>
                  ) : (
                    dossiers
                      .filter((d) => d.status === "PENDING")
                      .map((dossier) => (
                        <div
                          key={dossier.id}
                          className="p-3 rounded-lg border border-[var(--border-soft)] bg-[var(--background-elevated)]/70"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-[var(--foreground)]">
                                {dossier.characterName}
                              </p>
                              <p className="text-xs text-[var(--foreground-muted)]">
                                @{dossier.discordUsername || "unknown"}
                              </p>
                            </div>
                            <span className="text-xs text-[var(--foreground-muted)]">
                              {dossier.divisionName ?? ""}
                              {dossier.subdivisionName ? ` • ${dossier.subdivisionName}` : ""}
                            </span>
                          </div>
                          <p className="text-sm text-[var(--foreground)] mt-2 max-h-24 overflow-hidden">
                            {dossier.bio}
                          </p>
                          <form action={approveDossierAction} className="mt-3">
                            <input type="hidden" name="dossierId" value={dossier.id} />
                            <button
                              type="submit"
                              className="px-3 py-1.5 rounded-md text-xs font-semibold border border-[var(--accent-soft)] bg-[var(--background-elevated)] hover:bg-[var(--accent-soft)]/15 hover:border-[var(--accent-soft)] transition-colors text-[var(--foreground)] cursor-pointer"
                            >
                              Approve
                            </button>
                          </form>
                        </div>
                      ))
                  )}
                </div>
              </div>

              <div className="border border-[var(--border-soft)] rounded-lg p-4 bg-[var(--background-secondary)]/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
                      Approved Dossiers
                    </p>
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">
                      Published
                    </h3>
                    
                  </div>
                  <span className="text-sm font-semibold px-3 py-1 rounded-full bg-[var(--accent-soft)]/15 border border-[var(--accent-soft)] text-[var(--foreground)]">
                    {dossiers.filter((d) => d.status === "APPROVED").length}
                  </span>
                </div>

                <ApprovedDossiersSection 
                  dossiers={approvedDossiers}
                  divisions={divisions}
                  subdivisions={subdivisions}
                  onEdit={editDossierAction}
                  onDelete={deleteDossierAction}
                  onUnapprove={revertDossierAction}
                />
              </div>
            </div>
          </>
        )}

        {activeTab === "social" && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.1em] text-[var(--foreground-muted)]">
                  Social Workflow
                </p>
                <h2 className="text-lg font-semibold text-[var(--foreground)]">
                  Community Streamers
                </h2>
                <p className="text-sm text-[var(--foreground-muted)]">
                  Review and approve Twitch channel submissions from House Wolf members.
                </p>
              </div>
              <Link2 className="text-[var(--accent-main)]" size={20} />
            </div>

            <SocialLinksSection />
          </>
        )}
      </section>
    </div>
  );
}

