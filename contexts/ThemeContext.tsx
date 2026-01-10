"use client";

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { ThemeName, getTheme, defaultTheme } from '@/lib/theme-config';
import { useSession } from 'next-auth/react';

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [theme, setThemeState] = useState<ThemeName>(defaultTheme);
  const [isLoading, setIsLoading] = useState(true);
  const hasInitialized = useRef(false);

  // Initialize theme from API or localStorage
  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (hasInitialized.current) {
      return;
    }

    hasInitialized.current = true;

    if (status === 'authenticated' && session?.user?.id) {
      fetch('/api/user/theme')
        .then((res) => res.json())
        .then((data) => {
          if (data.theme) {
            setThemeState(data.theme as ThemeName);
          }
        })
        .catch(() => {
          const savedTheme = localStorage.getItem('hw-theme') as ThemeName | null;
          if (savedTheme) {
            setThemeState(savedTheme);
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      const savedTheme = localStorage.getItem('hw-theme') as ThemeName | null;
      if (savedTheme) {
        setThemeState(savedTheme);
      }
      setIsLoading(false);
    }
    // Only run when status changes, not when session object changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Apply theme whenever theme state changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = async (newTheme: ThemeName) => {
    setThemeState(newTheme);
    localStorage.setItem('hw-theme', newTheme);

    if (session?.user?.id) {
      try {
        await fetch('/api/user/theme', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ theme: newTheme }),
        });
      } catch (error) {
        console.error('Failed to save theme preference:', error);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

function applyTheme(themeName: ThemeName) {
  const themeConfig = getTheme(themeName);
  const dashboardContainer = document.getElementById('dashboard-theme-container');

  if (!dashboardContainer) {
    return;
  }

  dashboardContainer.style.setProperty('--hw-dark-crimson', themeConfig.colors.hwDarkCrimson);
  dashboardContainer.style.setProperty('--hw-deep-night', themeConfig.colors.hwDeepNight);
  dashboardContainer.style.setProperty('--hw-steel-teal', themeConfig.colors.hwSteelTeal);
  dashboardContainer.style.setProperty('--hw-obsidian', themeConfig.colors.hwObsidian);
  dashboardContainer.style.setProperty('--hw-shadow', themeConfig.colors.hwShadow);
  dashboardContainer.style.setProperty('--hw-midnight', themeConfig.colors.hwMidnight);
  dashboardContainer.style.setProperty('--hw-pure-black', themeConfig.colors.hwPureBlack);

  dashboardContainer.style.setProperty('--background-base', themeConfig.colors.backgroundBase);
  dashboardContainer.style.setProperty('--background-elevated', themeConfig.colors.backgroundElevated);
  dashboardContainer.style.setProperty('--background-card', themeConfig.colors.backgroundCard);
  dashboardContainer.style.setProperty('--background-soft', themeConfig.colors.backgroundSoft);

  dashboardContainer.style.setProperty('--text-primary', themeConfig.colors.textPrimary);
  dashboardContainer.style.setProperty('--text-secondary', themeConfig.colors.textSecondary);
  dashboardContainer.style.setProperty('--text-muted', themeConfig.colors.textMuted);
  dashboardContainer.style.setProperty('--text-inverse', themeConfig.colors.textInverse);

  dashboardContainer.style.setProperty('--accent-primary', themeConfig.colors.accentPrimary);
  dashboardContainer.style.setProperty('--accent-primary-hover', themeConfig.colors.accentPrimaryHover);
  dashboardContainer.style.setProperty('--accent-primary-active', themeConfig.colors.accentPrimaryActive);
  dashboardContainer.style.setProperty('--accent-secondary', themeConfig.colors.accentSecondary);
  dashboardContainer.style.setProperty('--accent-secondary-hover', themeConfig.colors.accentSecondaryHover);
  dashboardContainer.style.setProperty('--accent-secondary-active', themeConfig.colors.accentSecondaryActive);

  dashboardContainer.style.setProperty('--border-subtle', themeConfig.colors.borderSubtle);
  dashboardContainer.style.setProperty('--border-default', themeConfig.colors.borderDefault);
  dashboardContainer.style.setProperty('--border-strong', themeConfig.colors.borderStrong);
  dashboardContainer.style.setProperty('--border-crimson', themeConfig.colors.borderCrimson);
  dashboardContainer.style.setProperty('--border-teal', themeConfig.colors.borderTeal);

  dashboardContainer.style.setProperty('--status-success', themeConfig.colors.statusSuccess);
  dashboardContainer.style.setProperty('--status-success-text', themeConfig.colors.statusSuccessText);
  dashboardContainer.style.setProperty('--status-warning', themeConfig.colors.statusWarning);
  dashboardContainer.style.setProperty('--status-warning-text', themeConfig.colors.statusWarningText);
  dashboardContainer.style.setProperty('--status-error', themeConfig.colors.statusError);
  dashboardContainer.style.setProperty('--status-error-text', themeConfig.colors.statusErrorText);
  dashboardContainer.style.setProperty('--status-info', themeConfig.colors.statusInfo);
  dashboardContainer.style.setProperty('--status-info-text', themeConfig.colors.statusInfoText);

  dashboardContainer.style.setProperty('--shadow-crimson', themeConfig.colors.shadowCrimson);
  dashboardContainer.style.setProperty('--shadow-teal', themeConfig.colors.shadowTeal);

  dashboardContainer.setAttribute('data-theme', themeName);
}
