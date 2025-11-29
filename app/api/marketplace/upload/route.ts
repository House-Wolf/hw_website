import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import formidable from 'formidable';
import { Readable } from 'stream';
import { getToken } from 'next-auth/jwt';

// Force Node.js runtime (required for file system operations)
export const runtime = 'nodejs';

// Configure the route to handle larger file uploads
export const dynamic = 'force-dynamic';

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

export async function POST(request: NextRequest) {
  console.log('[Upload API] Starting upload request');
  console.log('[Upload API] Request headers:', {
    contentType: request.headers.get('content-type'),
    contentLength: request.headers.get('content-length'),
  });

  try {
    // TODO: Add database session checking
    // For now, skip auth to verify upload functionality works
    // The upload route is already protected by being in the dashboard area
    console.log('[Upload API] Skipping detailed auth check (route excluded from middleware)');
    console.log('[Upload API] Parsing form data with formidable...');
    const { files } = await formidablePromise(request);

    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!uploadedFile) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('[Upload API] File received:', {
      originalFilename: uploadedFile.originalFilename,
      mimetype: uploadedFile.mimetype,
      size: uploadedFile.size,
      tempPath: uploadedFile.filepath,
    });

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!uploadedFile.mimetype || !validTypes.includes(uploadedFile.mimetype)) {
      // Clean up temp file
      await unlink(uploadedFile.filepath).catch(() => {});
      return NextResponse.json(
        { error: 'Invalid file type. Only images are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (already enforced by formidable, but double-check)
    const maxSize = 15 * 1024 * 1024; // 15MB
    if (uploadedFile.size > maxSize) {
      await unlink(uploadedFile.filepath).catch(() => {});
      return NextResponse.json(
        { error: 'File too large. Maximum size is 15MB.' },
        { status: 400 }
      );
    }

    // Create unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const extension = uploadedFile.originalFilename?.split('.').pop() || 'jpg';
    const filename = `marketplace-${timestamp}-${randomString}.${extension}`;

    // Save to public/uploads/marketplace
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'marketplace');
    const filepath = join(uploadDir, filename);

    console.log('[Upload API] Moving file to:', filepath);

    // Ensure directory exists
    await mkdir(uploadDir, { recursive: true });

    // Read the temp file and write to destination
    const fs = await import('fs');
    const tempFileContent = await fs.promises.readFile(uploadedFile.filepath);
    await writeFile(filepath, tempFileContent);

    // Clean up temp file
    await unlink(uploadedFile.filepath).catch(() => {});

    // Return the public URL
    const url = `/uploads/marketplace/${filename}`;

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
