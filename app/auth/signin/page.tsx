import { SignInButton } from "@/components/auth/SignInButton";
import Image from "next/image";
import Link from "next/link";
import { JSX } from "react";

/**
 * @component SignInPage
 * @description Public sign-in landing page for House Wolf members.
 *              Renders the organization branding and provides a Discord-based
 *              authentication entry point via the SignInButton component.
 *              This component is intentionally a Server Component.
 * @returns {JSX.Element} Sign-in page layout
 * @author House Wolf Dev Team
 */
export default function SignInPage(): JSX.Element {
  return (
    // NEW: Use semantic <main> landmark for accessibility and SEO
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full">
        {/* Header / Branding */}
        <div className="text-center mb-8 -mt-24">
          <div className="flex justify-center mb-4">
            <div className="relative flex justify-center">
              {/* NEW: Glow wrapper */}
              <div className="rounded-full drop-shadow-[0_0_25px_rgba(17,78,98,3.0)] p-2">
                <Image
                  src="/images/global/HWiconnew.png"
                  alt="House Wolf Logo"
                  width={80}
                  height={80}
                  priority
                  className="relative z-10"
                />
              </div>
            </div>
          </div>

          <h1 className="text-4xl font-bold mb-2 text-foreground tracking-wide">
            House Wolf
          </h1>

          <p className="text-foreground-muted text-lg tracking-wider">
            Home of the Dragoons
          </p>
        </div>

        {/* Sign-in Card */}
        <section className="card text-center space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Welcome Back, Warrior
            </h2>
            <p className="text-foreground-muted">
              Sign in with your Discord account to access the member dashboard
            </p>
          </div>

          <div className="divider" />

          <div className="space-y-4">
            <SignInButton />

            <div className="bg-background-elevated/50 border border-border-subtle rounded-lg p-4">
              <p className="text-sm text-foreground-muted">
                You must be a member of the House Wolf Discord server to access
                this site.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-border-subtle">
            <p className="text-xs text-foreground-muted leading-relaxed">
              By signing in, you agree to sync your Discord roles and profile
              information with the House Wolf member system.
            </p>
          </div>
        </section>

        {/* Footer Navigation */}
        <div className="mt-6 text-center">
          {/* NEW: Use Next.js Link for client-side navigation */}
          <Link
            href="/"
            className="text-accent hover:text-accent-hover text-sm font-semibold transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
