"use client";

import React, { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { themes, ThemeName } from '@/lib/theme-config';
import { Palette, Check } from 'lucide-react';

const SettingsPage = () => {
  const { theme: currentTheme, setTheme, isLoading } = useTheme();
  const [saving, setSaving] = useState(false);

  const handleThemeChange = async (themeName: ThemeName) => {
    setSaving(true);
    try {
      await setTheme(themeName);
      setTimeout(() => setSaving(false), 500);
    } catch (error) {
      console.error('Failed to change theme:', error);
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-hw-foreground-muted">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-hw-background-card border border-border-base rounded-lg p-6 md:p-8 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <Palette className="w-6 h-6 text-accent-main" />
          <h2 className="text-2xl font-bold text-hw-foreground tracking-widest uppercase">
            Theme Settings
          </h2>
        </div>

        <p className="text-hw-foreground-muted mb-8">
          Customize your dashboard appearance by selecting a theme that suits your preference. Themes only apply to dashboard pages.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.values(themes).map((themeOption) => {
            const isActive = currentTheme === themeOption.name;

            return (
              <button
                key={themeOption.name}
                onClick={() => handleThemeChange(themeOption.name)}
                disabled={saving}
                className={`
                  relative group p-6 rounded-lg border-2 transition-all duration-300
                  ${
                    isActive
                      ? 'border-accent-main bg-gradient-to-br from-accent-main/10 to-transparent'
                      : 'border-border-base hover:border-accent-secondary bg-hw-background-elevated hover:bg-hw-background-soft'
                  }
                  ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {isActive && (
                  <div className="absolute top-4 right-4 w-8 h-8 bg-accent-main rounded-full flex items-center justify-center">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent-main to-accent-secondary flex items-center justify-center">
                      <Palette className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-bold text-hw-foreground">
                        {themeOption.displayName}
                      </h3>
                      <p className="text-sm text-hw-foreground-muted">
                        {themeOption.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <div
                      className="w-8 h-8 rounded border border-border-default"
                      style={{ backgroundColor: themeOption.colors.backgroundBase }}
                      title="Background Base"
                    />
                    <div
                      className="w-8 h-8 rounded border border-border-default"
                      style={{ backgroundColor: themeOption.colors.accentPrimary }}
                      title="Primary Accent"
                    />
                    <div
                      className="w-8 h-8 rounded border border-border-default"
                      style={{ backgroundColor: themeOption.colors.accentSecondary }}
                      title="Secondary Accent"
                    />
                    <div
                      className="w-8 h-8 rounded border border-border-default"
                      style={{ backgroundColor: themeOption.colors.textPrimary }}
                      title="Text Primary"
                    />
                  </div>
                </div>

                {!isActive && (
                  <div className="mt-4 text-sm text-accent-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                    Click to apply this theme
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {saving && (
          <div className="mt-6 p-4 bg-accent-secondary/10 border border-accent-secondary rounded-lg text-center">
            <p className="text-accent-secondary font-medium">Applying theme...</p>
          </div>
        )}
      </div>

      <div className="bg-hw-background-card border border-border-base rounded-lg p-6 md:p-8 shadow-lg">
        <h3 className="text-lg font-bold text-hw-foreground mb-4 tracking-widest uppercase">
          Theme Information
        </h3>
        <div className="space-y-3 text-sm text-hw-foreground-muted">
          <p>
            <strong className="text-hw-foreground">Current Theme:</strong>{' '}
            {themes[currentTheme].displayName}
          </p>
          <p>
            Your theme preference is automatically saved to your account and will be applied
            across all your devices.
          </p>
          <p>
            Theme changes are applied immediately to dashboard pages only. Public pages (home, marketplace, etc.) are not affected by theme settings.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
