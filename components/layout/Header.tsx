"use client";

import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
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
          </Link>

          {/* Slogan - Center */}
          <div className="absolute left-1/2 -translate-x-1/2 hidden md:block">
            <h1 className="text-2xl md:text-3xl text-orange-600 font-bold text-shadow-2xs tracking-wide">
              This is the Way!
            </h1>
          </div>

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