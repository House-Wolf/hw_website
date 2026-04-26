import { NextRequest, NextResponse } from "next/server";

const FLEETYARDS_API = "https://api.fleetyards.net/v1";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const search = request.nextUrl.searchParams.toString();
  const upstream = `${FLEETYARDS_API}/${path.join("/")}${search ? `?${search}` : ""}`;

  const response = await fetch(upstream, {
    headers: { Accept: "application/json" },
    // No credentials forwarded — server-to-server avoids the CORS/withCredentials conflict
  });

  const body = await response.text();

  return new NextResponse(body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/json",
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
    },
  });
}
