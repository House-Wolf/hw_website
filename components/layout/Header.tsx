import Link from "next/link";
import Image from "next/image";
import { UserButton } from "@/components/auth/UserButton";

export default function Header() {
  return (
    <nav className="sticky top-0 z-(--z-sticky) bg-[#252933] border-b border-(--border)/30 shadow-lg">
      <div className="container mx-auto">
        <div className="flex items-center justify-between h-16 md:h-20 px-4 md:px-6">
          {/* Logo - Left */}
          <Link href="/" className="flex items-center group">
            <Image
              src="/images/global/HWiconnew.png"
              alt="House Wolf Logo"
              width={60}
              height={60}
              className="group-hover:scale-110 transition-transform"
            />
            {/* TEXT STACK */}
            <div className="flex flex-col ml-3 leading-tight">
              <span className="text-white font-bold text-lg md:text-2xl">
                House Wolf
              </span>
              <span className="text-sm text-gray-400">
                Home of the Dragoons
              </span>
            </div>
          </Link>

          {/* Sign In Button - Right */}
          <Link
            href="/dashboard"
            className="btn btn-secondary text-sm md:text-base"
          >
            Sign In
          </Link>
        </div>
      </div>
    </nav>
  );
}
