import { SignInButton } from "@/components/auth/SignInButton";
import Image from "next/image";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--wolf-obsidian)] px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 text-[var(--wolf-pearl)]">
            🐺 House Wolf
          </h1>
          <p className="text-[var(--wolf-smoke)] text-lg">
            Home of the Dragoons
          </p>
        </div>

        <div className="card text-center space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-[var(--wolf-pearl)] mb-2">
              Welcome Back
            </h2>
            <p className="text-[var(--wolf-smoke)]">
              Sign in with your Discord account to access the member dashboard
            </p>
          </div>

          <div className="divider"></div>

          <div className="space-y-4">
            <SignInButton />

            <p className="text-sm text-[var(--wolf-smoke)]">
              You must be a member of the House Wolf Discord server to access
              this site.
            </p>
          </div>

          <div className="pt-4 border-t border-[var(--wolf-steel)]">
            <p className="text-xs text-[var(--wolf-smoke)]">
              By signing in, you agree to sync your Discord roles and profile
              information.
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-[var(--wolf-ember)] hover:text-[var(--wolf-rust)] text-sm"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
