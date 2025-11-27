import { JSX } from "react";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { HeaderButtons } from "../auth/HeaderButtons";

/**
 * @component Header - The main header component for the application.
 * @description Renders the header with logo, title, and authentication buttons.
 * @returns {JSX.Element} The header component.
 * @author House Wolf Dev Team
 */

export default async function Header() : Promise<JSX.Element> {

  const session = await auth();

  return (
    <header className="sticky top-0 z-1100 bg-[#252933] backdrop-blur-sm border-b border-border shadow-lg">
      <div className="container mx-auto px-4 md:px-6">
        
        <div className="grid grid-cols-[auto_1fr_auto] items-center h-16 md:h-20 gap-8">

           {/* LEFT — LOGO */}
        <Link href="/" className="flex items-center group -ml-2">
          <Image
            src="/images/global/HWiconnew.png"
            alt="House Wolf Icon"
            width={60}
            height={60}
            className="drop-shadow-[0_0_10px_rgba(17,78,98,0.6)]"
          />
        </Link>

          {/* Center Text */}
          <Link href="/" className="flex flex-col text-center leading-tight group">
            <span className="text-foreground font-bold text-lg md:text-2xl tracking-wide group-hover:text-crimson-light transition-colors">
              House Wolf
            </span>
            <span className="text-sm text-foreground-muted tracking-wider">
              Home of the Dragoons
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <HeaderButtons isLoggedIn={!!session?.user} />
          </div>
        </div>
      </div>
    </header>
  );
}
