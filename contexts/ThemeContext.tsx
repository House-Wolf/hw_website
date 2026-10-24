"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { defaultTheme, getTheme, isThemeName, type ThemeName } from "@/lib/theme-config";

type SaveStatus = "idle" | "saving" | "saved" | "local";
const ThemeContext = createContext<{
  theme: ThemeName;
  setTheme: (theme: ThemeName) => Promise<void>;
  isLoading: boolean;
  saveStatus: SaveStatus;
} | undefined>(undefined);

function savedTheme() {
  try { const value = localStorage.getItem("hw-theme"); return isThemeName(value) ? value : defaultTheme; }
  catch { return defaultTheme; }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [theme, setThemeState] = useState<ThemeName>(defaultTheme);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const changeVersion = useRef(0);
  const userId = session?.user?.id;

  useEffect(() => {
    if (status === "loading") return;
    const controller = new AbortController();
    const version = changeVersion.current;
    async function initialize() {
      let selected = savedTheme();
      if (status === "authenticated" && userId) {
        try {
          const response = await fetch("/api/user/theme", { signal: controller.signal });
          if (!response.ok) throw new Error("Theme unavailable");
          const data = await response.json();
          if (isThemeName(data.theme)) selected = data.theme;
        } catch { /* Retain the device preference when account settings are unavailable. */ }
      }
      if (!controller.signal.aborted && version === changeVersion.current) {
        setThemeState(selected);
        setIsLoading(false);
        try { localStorage.setItem("hw-theme", selected); } catch { /* Storage can be disabled. */ }
      }
    }
    void initialize();
    return () => controller.abort();
  }, [status, userId]);

  useEffect(() => {
    const container = document.getElementById("dashboard-theme-container");
    if (!container) return;
    const configuration = getTheme(theme);
    const colors = configuration.colors;
    container.style.colorScheme = configuration.colorScheme;
    container.dataset.colorScheme = configuration.colorScheme;
    for (const [key, value] of Object.entries(colors)) {
      const token = "--" + key.replace(/[A-Z]/g, letter => "-" + letter.toLowerCase());
      container.style.setProperty(token, value);
    }
    for (const name of ["accentPrimary", "accentSecondary"] as const) {
      const hex = colors[name].slice(1);
      const rgb = [0, 2, 4].map(offset => parseInt(hex.slice(offset, offset + 2), 16)).join(", ");
      container.style.setProperty(name === "accentPrimary" ? "--accent-primary-rgb" : "--accent-secondary-rgb", rgb);
    }
    container.dataset.theme = theme;
  }, [theme]);

  async function setTheme(next: ThemeName) {
    if (!isThemeName(next)) return;
    const version = ++changeVersion.current;
    setThemeState(next);
    try { localStorage.setItem("hw-theme", next); } catch { /* The current session can still preview themes. */ }
    setSaveStatus("saving");
    if (!userId) { setSaveStatus("local"); return; }
    try {
      const response = await fetch("/api/user/theme", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ theme: next }) });
      if (!response.ok) throw new Error("Theme could not be saved");
      if (version === changeVersion.current) setSaveStatus("saved");
    } catch {
      if (version === changeVersion.current) setSaveStatus("local");
    }
  }

  return <ThemeContext.Provider value={{ theme, setTheme, isLoading, saveStatus }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
}
