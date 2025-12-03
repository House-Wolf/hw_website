// app/api/marketplace/admin/update-category/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { ForbiddenError } from "@/lib/errors/ForbiddenError";

export async function POST(req: Request) {
  try {
    // 🔐 Enforce permission
    await requirePermission(PERMISSIONS.MARKETPLACE_ADMIN);

    // Parse request
    const { id, name, description } = await req.json();

    // Update category
    const updated = await prisma.marketplaceCategory.update({
      where: { id },
      data: { name, description },
    });

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { error: "You do not have permission to perform this action." },
        { status: 403 }
      );
    }

    console.error("API ERROR:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
