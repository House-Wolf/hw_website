"use client";

import type { CSSProperties } from "react";
import { ArrowUpRight, Check, CheckCheck, CloudOff, Monitor, Palette, Shield, Swords } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { themes } from "@/lib/theme-config";

export default function SettingsPage() {
  const { theme, setTheme, isLoading, saveStatus } = useTheme();
  return (
    <div className="dash-settings">
      <div className="dash-page-heading">
        <div>
          <p className="dash-eyebrow">PERSONAL WORKSPACE</p>
          <h1>Appearance</h1>
          <p>A different atmosphere. The same sense of purpose.</p>
        </div>
        <span className="dash-settings-badge"><Monitor size={15} />Dashboard only</span>
      </div>
      <section className="dash-panel dash-theme-intro">
        <span className="dash-feature-icon"><Palette size={22} /></span>
        <div>
          <h2>Find your point of view</h2>
          <p>Four palettes, composed around light, material and contrast. Select one to make it your own.</p>
        </div>
        <span className="dash-theme-current">{themes[theme].displayName}<span>Current theme</span></span>
      </section>
      <fieldset className="dash-theme-fieldset" disabled={isLoading || saveStatus === "saving"}>
        <legend className="sr-only">Choose a dashboard theme</legend>
        <div className="dash-theme-grid">
          {Object.values(themes).map((option, index) => {
            const selected = option.name === theme;
            const colors = option.colors;
            const previewStyle = {
              "--preview-base": colors.backgroundBase,
              "--preview-surface": colors.backgroundCard,
              "--preview-soft": colors.backgroundSoft,
              "--preview-text": colors.textPrimary,
              "--preview-muted": colors.textSecondary,
              "--preview-accent": colors.accentPrimary,
              "--preview-inverse": colors.textInverse,
              "--preview-border": colors.borderDefault,
              "--preview-secondary": colors.accentSecondary,
            } as CSSProperties;
            return (
              <button type="button" className="dash-theme-card" key={option.name} aria-pressed={selected} onClick={() => void setTheme(option.name)}>
                <div className="dash-theme-preview" style={previewStyle} aria-hidden="true">
                  <div className="dash-sample-topline"><span>HOUSE WOLF</span><span>{option.colorScheme === "light" ? "LIGHT EDITION" : "DARK EDITION"}</span></div>
                  <div className="dash-sample-workspace">
                    <div className="dash-sample-rail"><Shield size={15} /><i /><i /><i /><span /></div>
                    <div className="dash-sample-main">
                      <div className="dash-sample-breadcrumb">Workspace <span>/</span> Overview <ArrowUpRight size={12} /></div>
                      <div className="dash-sample-title">Room to focus.</div>
                      <p>Your people. Your next operation.</p>
                      <div className="dash-sample-bottom"><span className="dash-sample-action">Open workspace <ArrowUpRight size={11} /></span><span className="dash-sample-status"><span />Discord linked</span></div>
                    </div>
                    <div className="dash-sample-detail"><Swords size={18} /><span>OPERATIONS</span><strong>Stay in the loop.</strong><i /><i /><span className="dash-sample-detail-link">View operations <ArrowUpRight size={11} /></span></div>
                  </div>
                  <div className="dash-sample-caption"><span>0{index + 1} / THE COLLECTION</span><span>{option.displayName}</span></div>
                </div>
                <div className="dash-theme-card-body">
                  <div className="dash-theme-card-title"><h2>{option.displayName}</h2><span className="dash-theme-selected">{selected ? <Check size={14} /> : <span className="dash-theme-selection-ring" />}<span>{selected ? "Selected" : "Use theme"}</span></span></div>
                  <p>{option.description}</p>
                  <div className="dash-theme-card-footer"><div className="dash-theme-swatches" aria-hidden="true">{[colors.backgroundBase, colors.backgroundCard, colors.accentPrimary, colors.accentSecondary].map(color => <span key={color} style={{ background: color }} />)}</div><span>{option.colorScheme === "light" ? "Light palette" : "Dark palette"}</span></div>
                </div>
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="dash-theme-save" role="status" aria-live="polite">
        {saveStatus === "local" ? <CloudOff size={16} /> : <CheckCheck size={16} />}
        <span>{isLoading ? "Loading your preference..." : saveStatus === "saving" ? "Saving your appearance..." : saveStatus === "local" ? "Applied for this session. Account sync is unavailable; select your theme again to retry." : saveStatus === "saved" ? "Appearance saved to your account. All set." : "Your selection is saved to your account and follows you across devices."}</span>
      </div>
    </div>
  );
}
