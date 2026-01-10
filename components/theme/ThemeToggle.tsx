"use client";

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Moon, Sun } from 'lucide-react';

/**
 * Quick theme toggle button component
 * Can be placed anywhere in the app for quick theme switching
 */
export default function ThemeToggle() {
  const { theme, setTheme, isLoading } = useTheme();

  const toggleTheme = () => {
    const newTheme = theme === 'night' ? 'kamposian' : 'night';
    setTheme(newTheme);
  };

  if (isLoading) {
    return null;
  }

  const isNight = theme === 'night';

  return (
    <button
      onClick={toggleTheme}
      className="
        relative p-2 rounded-lg transition-all duration-300
        bg-hw-background-elevated hover:bg-hw-background-soft
        border border-border-default hover:border-accent-secondary
        group
      "
      title={`Switch to ${isNight ? 'Kamposian' : 'Night'} theme`}
      aria-label={`Switch to ${isNight ? 'Kamposian' : 'Night'} theme`}
    >
      <div className="relative w-6 h-6">
        {isNight ? (
          <Moon className="w-6 h-6 text-accent-secondary group-hover:text-accent-secondary-hover transition-colors" />
        ) : (
          <Sun className="w-6 h-6 text-accent-main group-hover:text-accent-primary-hover transition-colors" />
        )}
      </div>
    </button>
  );
}
