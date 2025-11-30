import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import formidable from 'formidable';
import { Readable } from 'stream';
import crypto from 'crypto';
import { auth } from '@/lib/auth';
import { isUserSuspended } from '@/lib/marketplace/suspension';
import { PERMISSIONS } from '@/lib/permissions';

// Force Node.js runtime (required for file system operations)
export const runtime = 'nodejs';

// Configure the route to handle larger file uploads
export const dynamic = 'force-dynamic';

const STORAGE_ROOT = join(process.cwd(), 'uploads', 'marketplace'); // outside /public
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h signed URL

// Helper function to convert NextRequest to Node.js IncomingMessage
async function formidablePromise(
  req: NextRequest
): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  return new Promise(async (resolve, reject) => {
    // Convert the Web ReadableStream to a Node.js readable stream
    const bodyStream = Readable.fromWeb(req.body as any);

    // Create formidable form
    const form = formidable({
      maxFileSize: 15 * 1024 * 1024, // 15MB
      maxTotalFileSize: 15 * 1024 * 1024, // 15MB
      keepExtensions: true,
    });

    // Create a mock IncomingMessage for formidable
    const mockReq = bodyStream as any;
    mockReq.headers = {};
    req.headers.forEach((value, key) => {
      mockReq.headers[key] = value;
    });

    form.parse(mockReq, (err, fields, files) => {
      if (err) {
        reject(err);
      } else {
        resolve({ fields, files });
      }
    });
  });
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB hard limit
const ALLOWED_TYPES: Record<
  string,
  { ext: string; signatures: Array<number[] | string> }
> = {
  'image/png': { ext: 'png', signatures: [[0x89, 0x50, 0x4e, 0x47]] },
  'image/jpeg': {
    ext: 'jpg',
    signatures: [[0xff, 0xd8, 0xff]],
  },
  'image/jpg': {
    ext: 'jpg',
    signatures: [[0xff, 0xd8, 0xff]],
  },
  'image/gif': {
    ext: 'gif',
    signatures: [
      [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
      [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
    ],
  },
  'image/webp': {
    ext: 'webp',
    signatures: ['RIFF'], // followed by WEBP later in the header
  },
};

function hasValidSignature(
  buffer: Buffer,
  mimetype: string | undefined
): boolean {
  if (!mimetype) return false;
  const rule = ALLOWED_TYPES[mimetype];
  if (!rule) return false;

  return rule.signatures.some((sig) => {
    if (typeof sig === 'string') {
      return buffer.slice(0, sig.length).toString('ascii') === sig;
    }
    const slice = buffer.slice(0, sig.length);
    return sig.every((byte, idx) => slice[idx] === byte);
  });
}

export async function POST(request: NextRequest) {
  console.log('[Upload API] Starting upload request');
  console.log('[Upload API] Request headers:', {
    contentType: request.headers.get('content-type'),
    contentLength: request.headers.get('content-length'),
  });

  const signingSecret = process.env.FILE_TOKEN_SECRET || process.env.NEXTAUTH_SECRET;
  if (!signingSecret) {
    return NextResponse.json(
      { error: 'Server misconfigured: FILE_TOKEN_SECRET missing' },
      { status: 500 }
    );
  }

  // Require authenticated, non-suspended users to prevent arbitrary uploads
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canUpload =
    session.user.permissions?.some((perm) =>
      [
        PERMISSIONS.MARKETPLACE_ADMIN,
        PERMISSIONS.MARKETPLACE_MODERATOR,
        PERMISSIONS.SITE_ADMIN,
      ].includes(perm)
    ) ?? false;

  if (!canUpload) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const suspended = await isUserSuspended(session.user.id);
  if (suspended) {
    return NextResponse.json(
      { error: 'Marketplace access suspended' },
      { status: 403 }
    );
  }

  try {
    console.log('[Upload API] Parsing form data with formidable...');
    const { files } = await formidablePromise(request);

    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!uploadedFile) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type (mimetype allowlist + magic number check)
    const allowed = uploadedFile.mimetype && ALLOWED_TYPES[uploadedFile.mimetype];
    if (!allowed) {
      await unlink(uploadedFile.filepath).catch(() => {});
      return NextResponse.json(
        { error: 'Invalid file type. Only PNG, JPG, GIF, or WEBP images are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (server-side)
    if (uploadedFile.size > MAX_FILE_SIZE) {
      await unlink(uploadedFile.filepath).catch(() => {});
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    const fs = await import('fs');
    const tempFileContent = await fs.promises.readFile(uploadedFile.filepath);
    if (!hasValidSignature(tempFileContent, uploadedFile.mimetype)) {
      await unlink(uploadedFile.filepath).catch(() => {});
      return NextResponse.json(
        { error: 'File failed signature validation.' },
        { status: 400 }
      );
    }

    // Create unique filename using UUID and trusted extension
    const filename = `marketplace-${crypto.randomUUID()}.${allowed.ext}`;

    // Save outside /public
    const uploadDir = STORAGE_ROOT;
    const filepath = join(uploadDir, filename);

    console.log('[Upload API] Moving file to:', filepath);

    // Ensure directory exists
    await mkdir(uploadDir, { recursive: true });

    // Write validated content to destination
    await writeFile(filepath, tempFileContent);

    // Clean up temp file
    await unlink(uploadedFile.filepath).catch(() => {});

    // Return a signed URL routed through an authenticated proxy endpoint
    const expiresAt = Date.now() + TOKEN_TTL_MS;
    const signature = crypto
      .createHmac('sha256', signingSecret)
      .update(`${filename}:${expiresAt}`)
      .digest('hex');

    const url = `/api/marketplace/uploaded/${filename}?exp=${expiresAt}&sig=${signature}`;

    console.log('[Upload API] Upload successful:', url);
    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    console.error('[Upload API] Error uploading file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to upload file: ${errorMessage}` },
      { status: 500 }
    );
  }
}
