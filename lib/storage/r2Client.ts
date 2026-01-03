import { S3Client } from "@aws-sdk/client-s3";

// Validate required environment variables
const requiredEnvVars = {
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET: process.env.R2_BUCKET,
  R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
};

const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error("❌ Missing R2 environment variables:", missingVars.join(", "));
  console.error("⚠️  Profile uploads will NOT work until these are configured!");
  console.error("📝 Check your .env file and compare with .env.example");
}

const endpoint = process.env.R2_ACCOUNT_ID
  ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
  : undefined;

if (!endpoint) {
  console.error("❌ Cannot construct R2 endpoint - R2_ACCOUNT_ID is missing");
}

export const r2 = new S3Client({
  region: "auto",
  endpoint: endpoint!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});
