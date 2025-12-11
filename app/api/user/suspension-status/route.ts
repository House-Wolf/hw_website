import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  getUserSuspensionDetails,
  isUserSuspended,
} from "@/lib/marketplace/suspension";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = session.user.permissions?.includes(
      PERMISSIONS.MARKETPLACE_ADMIN
    );

    // Admins bypass suspension checks
    if (isAdmin) {
      return NextResponse.json(
        { isSuspended: false, details: null, bypassed: true },
        { status: 200 }
      );
    }

    const suspended = await isUserSuspended(session.user.id);
    const details = suspended
      ? await getUserSuspensionDetails(session.user.id)
      : null;

    return NextResponse.json(
      {
        isSuspended: suspended,
        details,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error checking user suspension status:", error);
    return NextResponse.json(
      { error: "Failed to check suspension status", isSuspended: false },
      { status: 500 }
    );
  }
}
