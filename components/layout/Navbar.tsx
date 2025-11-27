"use client";

import { usePathname } from "next/navigation";
import NavbarClient from "./NavbarClient";

export default function Navbar() {
  const pathname = usePathname();

  // Hide navbar on dashboard routes
  if (pathname?.startsWith("/dashboard")) {
    return null;
  }

  return <NavbarClient />;
}
