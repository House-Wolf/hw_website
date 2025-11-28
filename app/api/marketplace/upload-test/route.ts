import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'Upload API is reachable' });
}

export async function POST() {
  return NextResponse.json({ status: 'ok', message: 'POST endpoint is reachable' });
}
