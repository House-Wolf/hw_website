import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deriveUserPermissions } from "@/lib/deriveUserpermissions";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
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
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Derive permissions
    const permissionSet = deriveUserPermissions(user.roles);
    const permissions = Array.from(permissionSet);

    // Build permissions map with descriptions
    const permissionsMap = new Map<string, string | null>();

    // Add database-defined permissions with their descriptions
    user.roles.forEach(({ discordRole }) => {
      discordRole.permissions.forEach(({ permission }) => {
        permissionsMap.set(permission.key, permission.description);
      });
    });

    // Add special permissions (these don't have database descriptions)
    permissions.forEach((key) => {
      if (!permissionsMap.has(key)) {
        const descriptions: Record<string, string> = {
          SITE_ADMIN: "Site administrator",
          MARKETPLACE_ADMIN: "Marketplace administrator",
          DOSSIER_ADMIN: "Dossier administrator",
        };
        permissionsMap.set(key, descriptions[key] || null);
      }
    });

    const permissionsWithDescriptions = Array.from(permissionsMap.entries()).map(
      ([key, description]) => ({ key, description })
    );

    return NextResponse.json({
      id: user.id,
      name: user.name,
      discordUsername: user.discordUsername,
      discordDisplayName: user.discordDisplayName,
      avatarUrl: user.avatarUrl,
      image: user.image,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      roles: user.roles,
      permissions: permissionsWithDescriptions,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}
