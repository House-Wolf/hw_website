import { SignInButton } from "@/components/auth/SignInButton";
import Image from "next/image";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full">
        <div className="text-center mb-8 -mt-25">
          <div className="flex justify-center mb-4">
            <Image
              src="/images/global/HWiconnew.png"
              alt="House Wolf Logo"
              width={80}
              height={80}
              className="drop-shadow-crimson"
            />
          </div>
          <h1 className="text-4xl font-bold mb-2 text-foreground tracking-wide">
            House Wolf
          </h1>
          <p className="text-foreground-muted text-lg tracking-wider">
            Home of the Dragoons
          </p>
        </div>

        <div className="card text-center space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Welcome Back, Warrior
            </h2>
            <p className="text-foreground-muted">
              Sign in with your Discord account to access the member dashboard
            </p>
          </div>

          <div className="divider"></div>

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
        </div>

        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-accent hover:text-accent-hover text-sm font-semibold transition-colors"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
