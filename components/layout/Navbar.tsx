"use client";

import { usePathname } from "next/navigation";
import NavbarClient from "./NavbarClient";

/**
 * @component Navbar
 * @description Renders the Navbar component conditionally based on the current pathname.
 * If the pathname starts with "/dashboard", the Navbar is not rendered.
 * @returns {JSX.Element | null} The Navbar component or null.
 * @author House Wolf Dev Team
 */
export default function Navbar() {
  const pathname = usePathname();

  if (pathname?.startsWith("/dashboard")) {
    return null;
  }

  return <NavbarClient />;
}
