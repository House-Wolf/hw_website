import { auth } from "@/lib/auth";
import { SignInButton } from "./SignInButton";
import { SignOutButton } from "./SignOutButton";
import Image from "next/image";

export async function UserButton() {
  const session = await auth();

  if (!session?.user) {
    return <SignInButton />;
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-3">
        {session.user.image && (
          <Image
            src={session.user.image}
            alt={session.user.name || "User avatar"}
            width={32}
            height={32}
            className="rounded-full"
          />
        )}
        <div className="hidden md:block text-sm">
          <p className="font-semibold text-[var(--wolf-pearl)]">
            {session.user.name || session.user.discordUsername}
          </p>
          <p className="text-[var(--wolf-smoke)] text-xs">
            @{session.user.discordUsername}
          </p>
        </div>
      </div>
      <SignOutButton />
    </div>
  );
}
