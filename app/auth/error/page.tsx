"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { JSX, Suspense } from "react";


/**
 * @component ErrorMessageMap
 * @description Static map of authentication error codes to user-facing
 *              titles and descriptions.
 * @author House Wolf Dev Team
 */
const ERROR_MESSAGES: Record<
  string,
  { title: string; description: string }
> = {
  Configuration: {
    title: "Configuration Error",
    description:
      "There is a problem with the server configuration. Please contact support.",
  },
  AccessDenied: {
    title: "Access Denied",
    description:
      "You must be a member of the House Wolf Discord server to access this site.",
  },
  Verification: {
    title: "Verification Error",
    description:
      "The verification link may have expired or already been used.",
  },
  Suspended: {
    title: "Access Suspended",
    description:
      "Your account has been suspended from dashboard access. Contact an administrator if you believe this is an error.",
  },
  Default: {
    title: "Authentication Error",
    description:
      "An error occurred during authentication. Please try again.",
  },
};

/**
 * @component ErrorContent
 * @description Reads the `error` query parameter and renders the corresponding
 *              authentication error message and guidance.
 * @returns {JSX.Element} Error content block
 * @author House Wolf Dev Team
 */
function ErrorContent(): JSX.Element {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const errorInfo =
    ERROR_MESSAGES[error || "Default"] ?? ERROR_MESSAGES.Default;

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--wolf-obsidian)] px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 text-[var(--wolf-pearl)]">
            🐺 House Wolf
          </h1>
          <p className="text-[var(--wolf-smoke)] text-lg">
            Home of the Dragoons
          </p>
        </div>

        <section className="card text-center space-y-6">
          <div className="text-6xl" aria-hidden="true">
            ⚠️
          </div>

          <div>
            <h2 className="text-2xl font-bold text-[var(--wolf-pearl)] mb-2">
              {errorInfo.title}
            </h2>
            <p className="text-[var(--wolf-smoke)]">
              {errorInfo.description}
            </p>
          </div>

          {error === "AccessDenied" && (
            <div className="bg-[var(--wolf-ash)] border border-[var(--wolf-steel)] rounded-lg p-4 text-sm text-left">
              <p className="font-semibold text-[var(--wolf-pearl)] mb-2">
                To gain access:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-[var(--wolf-smoke)]">
                <li>Join the House Wolf Discord server</li>
                <li>Complete the onboarding process</li>
                <li>Try signing in again</li>
              </ol>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <Link href="/auth/signin" className="btn btn-primary">
              Try Again
            </Link>
            <Link href="/" className="btn btn-secondary">
              Go Home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

/**
 * @component AuthErrorPageWrapper
 * @description Suspense wrapper required for reading URL search parameters
 *              in a Client Component using `useSearchParams`.
 * @returns {JSX.Element} Suspense-wrapped error page
 * @author House Wolf Dev Team
 */
export default function AuthErrorPage(): JSX.Element {
  return (
    <Suspense
      // NEW: Accessible loading state
      fallback={
        <div
          className="min-h-screen flex items-center justify-center bg-[var(--wolf-obsidian)]"
          role="status"
          aria-live="polite"
        >
          Loading…
        </div>
      }
    >
      <ErrorContent />
    </Suspense>
  );
}
