import { NextResponse } from "next/server";
import { ListBucketsCommand } from "@aws-sdk/client-s3";
import { r2 } from "@/lib/storage/r2Client";

/**
 * Test endpoint to verify R2 configuration
 * Visit /api/test-r2 to check if R2 is properly configured
 */
export async function GET() {
  const envCheck = {
    R2_ACCOUNT_ID: !!process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: !!process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: !!process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET: !!process.env.R2_BUCKET,
    R2_PUBLIC_URL: !!process.env.R2_PUBLIC_URL,
  };

  const missingVars = Object.entries(envCheck)
    .filter(([_, exists]) => !exists)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing environment variables",
        missing: missingVars,
        message: "Add these variables to your .env file",
      },
      { status: 500 }
    );
  }

  // Try to connect to R2
  try {
    await r2.send(new ListBucketsCommand({}));

    return NextResponse.json({
      success: true,
      message: "R2 connection successful!",
      config: {
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        bucket: process.env.R2_BUCKET,
        publicUrl: process.env.R2_PUBLIC_URL,
      },
    });
  } catch (error) {
    console.error("R2 connection test failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "R2 connection failed",
        details: error instanceof Error ? error.message : "Unknown error",
        message: "Check your R2 credentials and account ID",
      },
      { status: 500 }
    );
  }
}
