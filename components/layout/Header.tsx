import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { HeaderButtons } from "../auth/HeaderButtons";

export default async function Header() {

  const session = await auth();

  return (
    <header className="sticky top-0 z-sticky bg-[#252933] backdrop-blur-sm border-b border-border shadow-lg">
      <div className="container mx-auto">
        <div className="flex items-center justify-between h-16 md:h-20">

          {/* Logo - Left */}
          <Link href="/" className="flex items-center group">
            <div className="relative">
              <Image
                src="/images/global/HWiconnew.png"
                alt="House Wolf Logo"
                width={60}
                height={60}
                className="transition-transform duration-base group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-crimson/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-base -z-10" />
            </div>

            <div className="flex flex-col ml-3 leading-tight">
              <span className="text-foreground font-bold text-lg md:text-2xl tracking-wide">
                House Wolf
              </span>
              <span className="text-sm text-foreground-muted tracking-wider">
                Home of the Dragoons
              </span>
            </div>
          </Link>

          {/* Right-Side Button */}
          <HeaderButtons isLoggedIn={!!session?.user} />

        </div>
      </div>
    </header>
  );
}
