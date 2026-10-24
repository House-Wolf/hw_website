/**
 * Theme Configuration
 * Defines all available themes with their color schemes
 */

export type ThemeName = 'night' | 'kamposian' | 'ember' | 'frost';

export interface ThemeColors {
  // House Wolf Official Color Palette
  hwDarkCrimson: string;
  hwDeepNight: string;
  hwSteelTeal: string;
  hwObsidian: string;
  hwShadow: string;
  hwMidnight: string;
  hwPureBlack: string;

  // Semantic Color System
  backgroundBase: string;
  backgroundElevated: string;
  backgroundCard: string;
  backgroundSoft: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  accentPrimary: string;
  accentPrimaryHover: string;
  accentPrimaryActive: string;
  accentSecondary: string;
  accentSecondaryHover: string;
  accentSecondaryActive: string;

  borderSubtle: string;
  borderDefault: string;
  borderStrong: string;
  borderCrimson: string;
  borderTeal: string;

  statusSuccess: string;
  statusSuccessText: string;
  statusWarning: string;
  statusWarningText: string;
  statusError: string;
  statusErrorText: string;
  statusInfo: string;
  statusInfoText: string;

  shadowCrimson: string;
  shadowTeal: string;
}

export interface Theme {
  name: ThemeName;
  displayName: string;
  description: string;
  colorScheme: 'dark' | 'light';
  colors: ThemeColors;
}

function palette(base: string, elevated: string, card: string, soft: string, primary: string, hover: string, secondary: string, text: string, muted: string, light = false): ThemeColors {
  return {
    hwDarkCrimson: primary, hwDeepNight: soft, hwSteelTeal: secondary,
    hwObsidian: elevated, hwShadow: base, hwMidnight: card, hwPureBlack: base,
    backgroundBase: base, backgroundElevated: elevated, backgroundCard: card, backgroundSoft: soft,
    textPrimary: text, textSecondary: muted, textMuted: muted, textInverse: light ? '#ffffff' : '#10141c',
    accentPrimary: primary, accentPrimaryHover: hover, accentPrimaryActive: primary,
    accentSecondary: secondary, accentSecondaryHover: secondary, accentSecondaryActive: secondary,
    borderSubtle: light ? 'rgba(44, 53, 62, 0.07)' : 'rgba(210, 212, 220, 0.07)',
    borderDefault: light ? 'rgba(44, 53, 62, 0.13)' : 'rgba(210, 212, 220, 0.13)',
    borderStrong: light ? 'rgba(44, 53, 62, 0.25)' : 'rgba(210, 212, 220, 0.25)',
    borderCrimson: `color-mix(in srgb, ${primary} 28%, transparent)`, borderTeal: `color-mix(in srgb, ${secondary} 25%, transparent)`,
    statusSuccess: light ? '#e3eee7' : '#14392c', statusSuccessText: light ? '#35634a' : '#87d6ae',
    statusWarning: light ? '#f0e7d5' : '#41351e', statusWarningText: light ? '#765820' : '#ebc782',
    statusError: light ? '#f6e5e7' : '#40232c', statusErrorText: light ? '#923b48' : '#f0a0aa',
    statusInfo: light ? '#e3ebf3' : '#23334b', statusInfoText: light ? '#365779' : '#a6c6f0',
    shadowCrimson: '0 8px 28px rgb(0 0 0 / 0.08)', shadowTeal: '0 8px 28px rgb(0 0 0 / 0.08)',
  };
}

export const themes: Record<ThemeName, Theme> = {
  night: {
    name: 'night', displayName: 'Blood Oath', colorScheme: 'dark', description: 'Crimson and platinum on ink-black, inspired by the code that binds the pack.',
    colors: palette('#101114', '#15171a', '#1c1f23', '#25292e', '#e69a9c', '#f2b4b5', '#b8b1a4', '#edece9', '#b0afa9'),
  },
  kamposian: {
    name: 'kamposian', displayName: 'Kamposian Legacy', colorScheme: 'dark', description: 'Smoked violet and silver, a tribute to the enduring legacy of the Kamposian Dragoons.',
    colors: palette('#131118', '#1a1720', '#211d29', '#2b2535', '#c4b0de', '#dbcaef', '#c0b9ce', '#f1edf5', '#b9afc4'),
  },
  ember: {
    name: 'ember', displayName: 'Ashes of Kampos', colorScheme: 'dark', description: 'Aged bronze and warm ivory over charcoal, recalling the fall of the Dragoon homeworld.',
    colors: palette('#171310', '#201a15', '#29211b', '#342a22', '#dfb887', '#f0cea5', '#c9ba9d', '#f3eae0', '#c0b09e'),
  },
  frost: {
    name: 'frost', displayName: 'Dragoon Space', colorScheme: 'dark', description: 'Deep navy, sapphire and silver, inspired by the stars beyond Kampos.',
    colors: palette('#0a1220', '#101c2d', '#16253a', '#1e3048', '#9cbce6', '#bdd3f0', '#b3c1d1', '#edf2fa', '#a9b8cc'),
  },
};

export const defaultTheme: ThemeName = 'night';

export function isThemeName(value: unknown): value is ThemeName {
  return typeof value === 'string' && Object.hasOwn(themes, value);
}

export function getTheme(themeName: ThemeName | null | undefined): Theme {
  return themes[isThemeName(themeName) ? themeName : defaultTheme];
}
