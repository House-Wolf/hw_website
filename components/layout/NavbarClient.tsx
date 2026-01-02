"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";
import { DIVISIONS } from "@/lib/divisions/divisionConfig";

interface NavItem {
  label: string;
  href?: string;
  submenu?: {
    label: string;
    items: { label: string; href: string; description?: string }[];
  }[];
}

const navItems: NavItem[] = [
  {
    label: "About House Wolf",
    submenu: [
      {
        label: "Who We Are",
        items: [
          {
            label: "Our History",
            href: "/origins",
            description: "The story of House Wolf",
          },
          {
            label: "Dragoon Code",
            href: "/code",
            description: "Our values and principles",
          },
          {
            label: "Leadership",
            href: "/leadership",
            description: "Meet our commanders",
          },
        ],
      },
    ],
  },
 {
  label: "Commands",
  submenu: [
    {
      label: "Overview",
      items: [
        {
          label: "All Divisions",
          href: "/divisions",
          description: "Explore our specialized divisions",
        },
      ],
    },
    {
      label: "Divisions",
      items: Object.values(DIVISIONS).map((division) => ({
        label: division.name,
        href: `/divisions/${division.slug}`,
        description: division.navDescription,
      })),
    },
  ],
},
  {
    label: "Marketplace",
    href: "/marketplace",
  },
  {
    label: "Fleet",
    href: "/fleet",
  },
  {
    label: "Socials",
    href: "/socials",
  },
];


/** 
 * @component NavbarClient
 * @description Responsive navigation bar with dropdowns for desktop and mobile views.
 * @returns {JSX.Element} The NavbarClient component.
 * @author House Wolf Dev Team
 */
export default function NavbarClient() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click (desktop)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Detect scroll for glass effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleDropdown = (index: number) => {
    setActiveDropdown((current) => (current === index ? null : index));
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setActiveDropdown(null);
  };

  return (
    <nav
      className={`sticky top-16 md:top-20 z-40 transition-all duration-300 border-b ${
        isScrolled
          ? "bg-background-card/30 backdrop-blur-xl border-white/20 shadow-xl"
          : "bg-red-950 backdrop-blur-md border-border-subtle shadow-md"
      }`}
    >
      <div className="w-full flex justify-center">
        <div className="w-full max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-14 md:h-16" ref={navRef}>
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="lg:hidden p-2 text-foreground hover:text-accent hover:bg-background-elevated rounded-md transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1 mx-auto">
              {navItems.map((item, index) => (
                <div key={index} className="relative">
                  {item.href ? (
                    <Link
                      href={item.href}
                      onClick={() => item.submenu && toggleDropdown(index)}
                      className="group flex items-center gap-1 px-4 py-2 text-lg font-semibold text-foreground-muted hover:text-foreground transition-all relative"
                    >
                      {item.label}
                      {item.submenu && (
                        <ChevronDown
                          size={16}
                          className={`transition-transform duration-base ${
                            activeDropdown === index ? "rotate-180" : ""
                          }`}
                        />
                      )}
                      {/* Underline on hover */}
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-crimson transition-all duration-base group-hover:w-full" />
                    </Link>
                  ) : (
                    <button
                      onClick={() => toggleDropdown(index)}
                      className="group flex items-center gap-1 px-4 py-2 text-lg font-semibold text-foreground-muted hover:text-foreground transition-all relative"
                    >
                      {item.label}
                      {item.submenu && (
                        <ChevronDown
                          size={16}
                          className={`transition-transform duration-base ${
                            activeDropdown === index ? "rotate-180" : ""
                          }`}
                        />
                      )}
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-crimson transition-all duration-base group-hover:w-full" />
                    </button>
                  )}

                  {/* Desktop Dropdown */}
                  {item.submenu && activeDropdown === index && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 bg-background-card border border-border rounded-lg shadow-xl overflow-hidden animate-fadeIn">
                      {item.submenu.map((section, sectionIndex) => (
                        <div
                          key={sectionIndex}
                          className="p-4 border-b border-border-subtle last:border-b-0"
                        >
                          <div className="text-xs font-bold text-accent uppercase tracking-widest mb-3">
                            {section.label}
                          </div>
                          <div className="space-y-1">
                            {section.items.map((subItem, subIndex) => (
                              <Link
                                key={subIndex}
                                href={subItem.href}
                                onClick={() => setActiveDropdown(null)}
                                className="block px-3 py-2 rounded-md hover:bg-background-elevated transition-colors group"
                              >
                                <div className="font-semibold text-sm text-foreground group-hover:text-accent transition-colors">
                                  {subItem.label}
                                </div>
                                {subItem.description && (
                                  <div className="text-xs text-foreground-muted mt-0.5">
                                    {subItem.description}
                                  </div>
                                )}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-border-subtle bg-background-soft max-h-[calc(100vh-8rem)] overflow-y-auto">
              <div className="py-3 space-y-1">
                {navItems.map((item, index) => (
                  <div key={index}>
                    {/* Simple link (no submenu) */}
                    {item.href && !item.submenu ? (
                      <Link
                        href={item.href}
                        onClick={closeMobileMenu}
                        className="block px-4 py-3 text-base text-foreground hover:bg-background-elevated hover:text-accent transition-colors font-medium"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <div>
                        {/* Parent button with submenu */}
                        <button
                          onClick={() => toggleDropdown(index)}
                          className="w-full flex items-center justify-between px-4 py-3 text-base text-foreground hover:bg-background-elevated hover:text-accent transition-colors font-semibold"
                        >
                          <span className="text-left">{item.label}</span>
                          <ChevronDown
                            size={18}
                            className={`transition-transform duration-base ${
                              activeDropdown === index ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {/* Mobile dropdown — left aligned, compact */}
                        {activeDropdown === index && item.submenu && (
                          <div className="bg-background-elevated/60 py-2">
                            {item.submenu.map((section, sectionIndex) => (
                              <div
                                key={sectionIndex}
                                className="px-4 py-2 border-l border-border-subtle"
                              >
                                <div className="text-[11px] font-bold text-accent-secondary mb-1 uppercase tracking-wider">
                                  {section.label}
                                </div>
                                <div className="space-y-1">
                                  {section.items.map((subItem, subIndex) => (
                                    <Link
                                      key={subIndex}
                                      href={subItem.href}
                                      onClick={closeMobileMenu}
                                      className="block py-1.5 pl-3 text-sm text-foreground-muted hover:text-foreground hover:bg-background-soft rounded-md transition-colors text-left"
                                    >
                                      {subItem.label}
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
