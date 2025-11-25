"use client";

import { signIn } from "next-auth/react";
import { LogIn } from "lucide-react";

export function SignInButton() {
  return (
    <button
      onClick={() => signIn("discord", { callbackUrl: "/dashboard" })}
      className="btn btn-primary flex items-center gap-2"
    >
      <LogIn size={18} />
      Sign in with Discord
    </button>
  );
}
