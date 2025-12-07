import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const encoded = req.nextUrl.searchParams.get("key");
    if (!encoded) return NextResponse.redirect("/");

    const inviteUrl = atob(encoded);

    // Secure redirect—user cannot see real invite URL
    return NextResponse.redirect(inviteUrl, 302);
  } catch {
    return NextResponse.redirect("/");
  }
}
