"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

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
          { label: "Our History", href: "/origins", description: "The story of House Wolf" },
          { label: "Dragoon Code", href: "/about/code", description: "Our values and principles" },
          { label: "Leadership", href: "/commands/LEADERSHIP", description: "Meet our commanders" },
        ],
      },
    ],
  },
  {
    label: "Commands",
    href: "/commands",
    submenu: [
      {
        label: "Operational Units",
        items: [
          { label: "LOCOPS", href: "/commands/LOCOPS", description: "Logistics Operations" },
          { label: "TACOPS", href: "/commands/TACOPS", description: "Tactical Operations" },
          { label: "SPECOPS", href: "/commands/SPECOPS", description: "Special Operations" },
          { label: "ARCCOPS", href: "/commands/ARCCOPS", description: "Arctic Operations" },
        ],
      },
    ],
  },
  {
    label: "Marketplace",
    href: "/marketplace",
  },
  {
    label: "Streaming",
    href: "/streaming",
  },
];

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = (index: number) => {
    setActiveDropdown(activeDropdown === index ? null : index);
  };

  return (
    <nav className="sticky top-0 z-(--z-sticky) bg-red-950 border-b border-border shadow-(--shadow-soft)">
      <div className="w-full flex justify-center">
        <div className="w-full max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-16 md:h-20">

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-2 mx-auto" ref={navRef}>
              {navItems.map((item, index) => (
                <div key={index} className="relative flex justify-center">
                  {item.href ? (
                    <Link
                      href={item.href}
                      onClick={() => item.submenu && toggleDropdown(index)}
                      className="flex items-center gap-1 px-4 py-2 text-lg font-semibold text-foreground hover:text-accent-main transition-colors"
                    >
                      {item.label}
                      {item.submenu && (
                        <ChevronDown
                          size={18}
                          className={`transition-transform ${
                            activeDropdown === index ? "rotate-180" : ""
                          }`}
                        />
                      )}
                    </Link>
                  ) : (
                    <button
                      onClick={() => toggleDropdown(index)}
                      className="flex items-center gap-1 px-4 py-2 text-lg font-semibold text-foreground hover:text-accent-main transition-colors"
                    >
                      {item.label}
                      {item.submenu && (
                        <ChevronDown
                          size={18}
                          className={`transition-transform ${
                            activeDropdown === index ? "rotate-180" : ""
                          }`}
                        />
                      )}
                    </button>
                  )}

                  {/* Dropdown */}
                  {item.submenu && activeDropdown === index && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 bg-background-elevated border border-border rounded-radius-lg shadow-shadow-strong overflow-hidden animate-fadeIn">
                      {item.submenu.map((section, sectionIndex) => (
                        <div key={sectionIndex} className="p-4">
                          <div className="text-md font-bold text-accent-strong mb-3 uppercase tracking-wider">
                            {section.label}
                          </div>
                          <div className="space-y-1">
                            {section.items.map((subItem, subIndex) => (
                              <Link
                                key={subIndex}
                                href={subItem.href}
                                className="block px-3 py-2 rounded-radius-md hover:bg-background-secondary transition-colors group"
                              >
                                <div className="font-semibold text-base text-foreground group-hover:text-accent-main transition-colors">
                                  {subItem.label}
                                </div>
                                {subItem.description && (
                                  <div className="text-md text-foreground-muted mt-0.5">
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

            {/* Mobile Menu */}
            {mobileMenuOpen && (
              <div className="lg:hidden border-t border-border bg-background-secondary max-h-[calc(100vh-4rem)] overflow-y-auto">
                <div className="py-4 space-y-1">
                  {navItems.map((item, index) => (
                    <div key={index}>
                      {item.href && !item.submenu ? (
                        <Link
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className="block px-4 py-3 text-base text-foreground hover:bg-background-elevated hover:text-accent-main transition-colors font-medium"
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <div>
                          <button
                            onClick={() =>
                              setActiveDropdown(activeDropdown === index ? null : index)
                            }
                            className="w-full flex items-center justify-between px-4 py-3 text-base text-foreground hover:bg-background-elevated hover:text-accent-main transition-colors font-semibold"
                          >
                            {item.label}
                            <ChevronDown
                              size={18}
                              className={`transition-transform ${
                                activeDropdown === index ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                          {activeDropdown === index && item.submenu && (
                            <div className="bg-wolf-obsidian py-2">
                              {item.submenu.map((section, sectionIndex) => (
                                <div key={sectionIndex} className="px-4 py-3">
                                  <div className="text-sm font-bold text-wolf-ember mb-2 uppercase tracking-wider">
                                    {section.label}
                                  </div>
                                  {section.items.map((subItem, subIndex) => (
                                    <Link
                                      key={subIndex}
                                      href={subItem.href}
                                      onClick={() => setMobileMenuOpen(false)}
                                      className="block px-3 py-2 text-base text-wolf-smoke hover:text-wolf-silver transition-colors"
                                    >
                                      {subItem.label}
                                    </Link>
                                  ))}
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
      </div>
    </nav>
  );
}
