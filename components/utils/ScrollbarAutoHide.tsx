"use client";

import { useEffect } from "react";

/**
 * @component ScrollbarAutoHide
 * @description Automatically hides the scrollbar after 2 seconds of scrolling inactivity
 * @author House Wolf Dev Team
 */
export default function ScrollbarAutoHide() {
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      // Remove inactive class and add active class when scrolling
      document.body.classList.remove("scrollbar-inactive");
      document.body.classList.add("scrollbar-active");

      // Clear previous timeout
      clearTimeout(scrollTimeout);

      // Set timeout to hide scrollbar after 2 seconds of inactivity
      scrollTimeout = setTimeout(() => {
        document.body.classList.remove("scrollbar-active");
        document.body.classList.add("scrollbar-inactive");
      }, 2000);
    };

    // Add scroll event listener
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Initialize as inactive after 2 seconds
    scrollTimeout = setTimeout(() => {
      document.body.classList.add("scrollbar-inactive");
    }, 2000);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  return null;
}
