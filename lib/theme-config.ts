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
  colors: ThemeColors;
}

export const themes: Record<ThemeName, Theme> = {
  night: {
    name: 'night',
    displayName: 'Night',
    description: 'Dark tactical theme with crimson accents',
    colors: {
      // House Wolf Official Color Palette
      hwDarkCrimson: '#8B0000',
      hwDeepNight: '#09171E',
      hwSteelTeal: '#1A8FAD',
      hwObsidian: '#0D1517',
      hwShadow: '#070B0C',
      hwMidnight: '#0A2330',
      hwPureBlack: '#000000',

      // Semantic Color System
      backgroundBase: '#070B0C',
      backgroundElevated: '#0D1517',
      backgroundCard: '#0A2330',
      backgroundSoft: '#09171E',

      textPrimary: '#F5F5F5',
      textSecondary: '#B8B8B8',
      textMuted: '#808080',
      textInverse: '#000000',

      accentPrimary: '#B22222',
      accentPrimaryHover: '#DC143C',
      accentPrimaryActive: '#8B0000',
      accentSecondary: '#20A8CC',
      accentSecondaryHover: '#3BC9DB',
      accentSecondaryActive: '#1A8FAD',

      borderSubtle: 'rgba(255, 255, 255, 0.08)',
      borderDefault: 'rgba(255, 255, 255, 0.15)',
      borderStrong: 'rgba(255, 255, 255, 0.3)',
      borderCrimson: 'rgba(178, 34, 34, 0.6)',
      borderTeal: 'rgba(32, 168, 204, 0.6)',

      statusSuccess: '#228B22',
      statusSuccessText: '#66FF66',
      statusWarning: '#FFA500',
      statusWarningText: '#FFD700',
      statusError: '#DC143C',
      statusErrorText: '#FF6B6B',
      statusInfo: '#20A8CC',
      statusInfoText: '#87CEEB',

      shadowCrimson: '0 0 24px rgba(178, 34, 34, 0.6), 0 0 12px rgba(178, 34, 34, 0.4)',
      shadowTeal: '0 0 20px rgba(32, 168, 204, 0.5), 0 0 10px rgba(32, 168, 204, 0.3)',
    },
  },
  kamposian: {
    name: 'kamposian',
    displayName: 'Kamposian',
    description: 'Professional theme inspired by the Kamposian project dashboard',
    colors: {
      // House Wolf Official Color Palette (adapted for Kamposian dashboard)
      // Using actual colors from the Kamposian dashboard implementation
      hwDarkCrimson: '#7C3AED', // purple-600 - primary accent from dashboard
      hwDeepNight: '#0d0d0d', // main background
      hwSteelTeal: '#A78BFA', // purple-400 - lighter accent
      hwObsidian: '#121212', // sidebar/elevated background
      hwShadow: '#0b0b0f', // deepest background (from admin panel)
      hwMidnight: '#1a1a1a', // hover state background
      hwPureBlack: '#000000', // pure black

      // Semantic Color System (matching Kamposian dashboard visual design)
      backgroundBase: '#0d0d0d', // Main background (bg-[#0d0d0d])
      backgroundElevated: '#1a1a1a', // Sidebar/header (bg-[#121212])
      backgroundCard: 'rgba(30, 27, 75, 0.4)', // Cards with purple tint
      backgroundSoft: 'rgba(45, 40, 90, 0.3)', // Alternate cards with purple tint

      textPrimary: '#FFFFFF', // White text on dark
      textSecondary: '#E5E5E5', // Brighter secondary text
      textMuted: '#B0B0B0', // Brighter muted text
      textInverse: '#0d0d0d', // Dark text on light (for buttons)

      accentPrimary: '#8B5CF6', // purple-500 - primary buttons/accents (brighter)
      accentPrimaryHover: '#A78BFA', // purple-400 - hover state (brighter)
      accentPrimaryActive: '#7C3AED', // purple-600 - active state
      accentSecondary: '#3B82F6', // blue-500 - secondary accent (brighter than emerald)
      accentSecondaryHover: '#60A5FA', // blue-400 - hover
      accentSecondaryActive: '#2563EB', // blue-600 - active

      borderSubtle: 'rgba(139, 92, 246, 0.1)', // Purple subtle borders
      borderDefault: 'rgba(139, 92, 246, 0.2)', // Purple default borders
      borderStrong: 'rgba(139, 92, 246, 0.4)', // Purple stronger borders
      borderCrimson: 'rgba(139, 92, 246, 0.5)', // purple accent border (stronger)
      borderTeal: 'rgba(167, 139, 250, 0.5)', // lighter purple border (stronger)

      statusSuccess: '#10B981', // emerald-500 - success states
      statusSuccessText: '#34D399', // emerald-400
      statusWarning: '#F59E0B', // amber-500 - warning
      statusWarningText: '#FBBF24', // amber-400
      statusError: '#EF4444', // red-500 - error/delete (brighter)
      statusErrorText: '#F87171', // red-400
      statusInfo: '#8B5CF6', // purple-500 - info (using primary color)
      statusInfoText: '#A78BFA', // purple-400

      shadowCrimson: '0 0 20px rgba(139, 92, 246, 0.6), 0 0 10px rgba(139, 92, 246, 0.4)', // Purple glow (stronger)
      shadowTeal: '0 0 16px rgba(167, 139, 250, 0.5), 0 0 8px rgba(167, 139, 250, 0.3)', // Lighter purple glow (stronger)
    },
  },
  ember: {
    name: 'ember',
    displayName: 'Ember',
    description: 'Warm theme with glowing orange and amber accents',
    colors: {
      // House Wolf Official Color Palette (adapted for Ember theme)
      hwDarkCrimson: '#D97706', // amber-600 - primary warm accent
      hwDeepNight: '#1C1917', // stone-900 - warm dark background
      hwSteelTeal: '#FB923C', // orange-400 - lighter warm accent
      hwObsidian: '#292524', // stone-800 - elevated warm background
      hwShadow: '#0C0A09', // stone-950 - deepest warm background
      hwMidnight: '#1F1E1A', // warm charcoal
      hwPureBlack: '#000000', // pure black

      // Semantic Color System (warm earth tones with glowing embers)
      backgroundBase: '#0C0A09', // Deep charcoal base
      backgroundElevated: '#1C1917', // Stone dark elevated
      backgroundCard: 'rgba(41, 37, 36, 0.6)', // Stone-800 with transparency
      backgroundSoft: 'rgba(28, 25, 23, 0.4)', // Stone-900 with transparency

      textPrimary: '#FAFAF9', // stone-50 - warm white
      textSecondary: '#E7E5E4', // stone-200 - warm light gray
      textMuted: '#A8A29E', // stone-400 - warm muted
      textInverse: '#0C0A09', // Dark text on light

      accentPrimary: '#F97316', // orange-500 - primary ember glow
      accentPrimaryHover: '#FB923C', // orange-400 - brighter glow
      accentPrimaryActive: '#EA580C', // orange-600 - active ember
      accentSecondary: '#FBBF24', // amber-400 - golden accent
      accentSecondaryHover: '#FCD34D', // amber-300 - lighter gold
      accentSecondaryActive: '#F59E0B', // amber-500 - active gold

      borderSubtle: 'rgba(249, 115, 22, 0.1)', // Orange subtle borders
      borderDefault: 'rgba(249, 115, 22, 0.2)', // Orange default borders
      borderStrong: 'rgba(249, 115, 22, 0.4)', // Orange stronger borders
      borderCrimson: 'rgba(249, 115, 22, 0.6)', // Orange accent border
      borderTeal: 'rgba(251, 146, 60, 0.6)', // Lighter orange border

      statusSuccess: '#22C55E', // green-500 - success
      statusSuccessText: '#4ADE80', // green-400
      statusWarning: '#EAB308', // yellow-500 - warning
      statusWarningText: '#FACC15', // yellow-400
      statusError: '#EF4444', // red-500 - error
      statusErrorText: '#F87171', // red-400
      statusInfo: '#F97316', // orange-500 - info (matches theme)
      statusInfoText: '#FB923C', // orange-400

      shadowCrimson: '0 0 28px rgba(249, 115, 22, 0.7), 0 0 14px rgba(249, 115, 22, 0.5)', // Ember glow
      shadowTeal: '0 0 24px rgba(251, 191, 36, 0.6), 0 0 12px rgba(251, 191, 36, 0.4)', // Golden glow
    },
  },
  frost: {
    name: 'frost',
    displayName: 'Frost',
    description: 'Cool arctic theme with icy cyan and blue accents',
    colors: {
      // House Wolf Official Color Palette (adapted for Frost theme)
      hwDarkCrimson: '#0891B2', // cyan-600 - primary cool accent
      hwDeepNight: '#0C1821', // deep navy - arctic night
      hwSteelTeal: '#22D3EE', // cyan-400 - ice blue
      hwObsidian: '#1E293B', // slate-800 - elevated cool background
      hwShadow: '#020617', // slate-950 - deepest cold background
      hwMidnight: '#0F172A', // slate-900 - midnight blue
      hwPureBlack: '#000000', // pure black

      // Semantic Color System (arctic frost with glowing ice)
      backgroundBase: '#020617', // Deep slate base
      backgroundElevated: '#0F172A', // Slate-900 elevated
      backgroundCard: 'rgba(15, 23, 42, 0.7)', // Slate-900 with transparency
      backgroundSoft: 'rgba(30, 41, 59, 0.5)', // Slate-800 with transparency

      textPrimary: '#F0F9FF', // sky-50 - cool white with blue tint
      textSecondary: '#E0F2FE', // sky-100 - cool light
      textMuted: '#94A3B8', // slate-400 - cool muted
      textInverse: '#020617', // Dark text on light

      accentPrimary: '#06B6D4', // cyan-500 - primary ice glow
      accentPrimaryHover: '#22D3EE', // cyan-400 - brighter ice
      accentPrimaryActive: '#0891B2', // cyan-600 - active ice
      accentSecondary: '#3B82F6', // blue-500 - deep blue accent
      accentSecondaryHover: '#60A5FA', // blue-400 - lighter blue
      accentSecondaryActive: '#2563EB', // blue-600 - active blue

      borderSubtle: 'rgba(6, 182, 212, 0.1)', // Cyan subtle borders
      borderDefault: 'rgba(6, 182, 212, 0.2)', // Cyan default borders
      borderStrong: 'rgba(6, 182, 212, 0.4)', // Cyan stronger borders
      borderCrimson: 'rgba(6, 182, 212, 0.6)', // Cyan accent border
      borderTeal: 'rgba(34, 211, 238, 0.6)', // Lighter cyan border

      statusSuccess: '#10B981', // emerald-500 - success
      statusSuccessText: '#34D399', // emerald-400
      statusWarning: '#F59E0B', // amber-500 - warning
      statusWarningText: '#FBBF24', // amber-400
      statusError: '#EF4444', // red-500 - error
      statusErrorText: '#F87171', // red-400
      statusInfo: '#06B6D4', // cyan-500 - info (matches theme)
      statusInfoText: '#22D3EE', // cyan-400

      shadowCrimson: '0 0 32px rgba(6, 182, 212, 0.8), 0 0 16px rgba(6, 182, 212, 0.6)', // Frost glow
      shadowTeal: '0 0 28px rgba(34, 211, 238, 0.7), 0 0 14px rgba(34, 211, 238, 0.5)', // Ice glow
    },
  },
};

export const defaultTheme: ThemeName = 'night';

export function getTheme(themeName: ThemeName | null | undefined): Theme {
  if (!themeName || !themes[themeName]) {
    return themes[defaultTheme];
  }
  return themes[themeName];
}
