"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="btn btn-secondary flex items-center gap-2"
    >
      <LogOut size={18} />
      Sign Out
    </button>
  );
}
