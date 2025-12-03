"use client";

import { JSX, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { HeaderButtons } from "../auth/HeaderButtons";

/**
 * @component Header - The main header component for the application.
 * @description Renders the header with logo, title, and authentication buttons.
 * Features a glass morphism effect when scrolled.
 */

interface HeaderProps {
  isLoggedIn?: boolean;
}

export default function Header({
  isLoggedIn = false,
}: HeaderProps): JSX.Element {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 border-b ${
        isScrolled
          ? "bg-background-card/30 backdrop-blur-xl border-white/20 shadow-xl"
          : "bg-[#000000] backdrop-blur-sm border-white/40 shadow-lg"
      }`}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-[auto_1fr_auto] items-center h-16 md:h-20 gap-8">
        
          {/* LEFT — LOGO */}
          <Link href="/" className="flex items-center group -ml-2">
            <Image
              src="/images/global/HWiconnew.png"
              alt="House Wolf Icon"
              width={75}
              height={75}
              className="hidden sm:block drop-shadow-[0_0_20px_rgba(17,78,98,0.6)]"
            />
          </Link>

          {/* Center Text */}
          <Link
            href="/"
            className="flex flex-col text-center leading-tight group"
          >
            <span className="text-foreground font-bold text-lg md:text-2xl tracking-wide group-hover:text-crimson-light transition-colors">
              House Wolf
            </span>
            <span className="text-sm text-foreground-muted tracking-wider">
              Home of the Dragoons
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <HeaderButtons isLoggedIn={isLoggedIn} />
          </div>
        </div>
      </div>
    </header>
  );
}
