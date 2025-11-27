# House Wolf Design System

**Elite Mercenary Organization | Dark, Tactical, Professional**

## Overview

The House Wolf design system embodies the warrior culture of an elite mercenary Star Citizen organization. This design prioritizes tactical aesthetics, military precision, and commanding presence with a dark color palette punctuated by crimson danger accents.

---

## Typography

### Font Families

**Primary Font: Inter**
- Clean, modern sans-serif for exceptional readability
- Usage: Body text, UI elements, headings
- Optimized for tactical information display

**Monospace Font: JetBrains Mono**
- Technical, code-like aesthetic for data readouts
- Usage: Timestamps, IDs, technical data, badges
- Reinforces military/technical theme

### Font Scale

```css
--font-xs: 0.75rem    /* 12px - Small labels, badges */
--font-sm: 0.875rem   /* 14px - Secondary text */
--font-base: 1rem     /* 16px - Body text */
--font-lg: 1.125rem   /* 18px - Large body */
--font-xl: 1.25rem    /* 20px - Small headings */
--font-2xl: 1.5rem    /* 24px - Medium headings */
--font-3xl: 1.875rem  /* 30px - Large headings */
--font-4xl: 2.25rem   /* 36px - Hero headings */
--font-5xl: 3rem      /* 48px - Display headings */
```

### Letter Spacing

```css
--tracking-tight: -0.025em   /* Tight condensed text */
--tracking-normal: 0         /* Standard */
--tracking-wide: 0.025em     /* Slight spacing */
--tracking-wider: 0.05em     /* Labels, badges */
--tracking-widest: 0.1em     /* Section headings, emphasis */
```

---

## Color Palette

### Official House Wolf Colors

```css
--hw-dark-crimson: #470000   /* Blood, danger, primary accent */
--hw-deep-night: #09171E     /* Deep space, mystery */
--hw-steel-teal: #114E62     /* Technology, armor, info */
--hw-obsidian: #0D1517       /* Structure, foundation */
--hw-shadow: #070B0C         /* Depth, void */
--hw-midnight: #071F27       /* Space, operations */
--hw-pure-black: #000000     /* Absolute darkness */
```

### Semantic Color System

#### Backgrounds (Layered Depth)
```css
--background-base: #070B0C       /* Main page background */
--background-elevated: #0D1517   /* Cards, raised surfaces */
--background-card: #071F27       /* Card backgrounds */
--background-soft: #09171E       /* Soft sections */
```

#### Text Hierarchy
```css
--text-primary: #E8E8E8      /* Main text, high contrast */
--text-secondary: #A8A8A8    /* Secondary text, muted */
--text-muted: #6B6B6B        /* Hints, disabled, subtle */
--text-inverse: #000000      /* Light backgrounds (rare) */
```

#### Accents
```css
--accent-primary: #470000        /* Crimson - Primary CTAs, danger */
--accent-primary-hover: #6B0000  /* Hover state */
--accent-primary-active: #8A0000 /* Active/pressed state */
--accent-secondary: #114E62      /* Teal - Info, tech elements */
--accent-secondary-hover: #1A6B8A
--accent-secondary-active: #0D3A4A
```

#### Borders
```css
--border-subtle: rgba(255, 255, 255, 0.05)  /* Very subtle dividers */
--border-default: rgba(255, 255, 255, 0.1)  /* Standard borders */
--border-strong: rgba(255, 255, 255, 0.2)   /* Emphasized borders */
--border-crimson: rgba(71, 0, 0, 0.5)       /* Accent borders */
--border-teal: rgba(17, 78, 98, 0.5)        /* Info borders */
```

#### Status Colors
```css
/* Success - Tactical Green */
--status-success: #1A5F3A
--status-success-text: #4ADE80

/* Warning - Amber */
--status-warning: #8A5A00
--status-warning-text: #FBBF24

/* Error - Crimson-based */
--status-error: #470000
--status-error-text: #FF6B6B

/* Info - Steel Teal */
--status-info: #114E62
--status-info-text: #60A5FA
```

### Tailwind Color Classes

```typescript
// In components
className="bg-background"           // Base background
className="bg-background-elevated"  // Raised surfaces
className="bg-background-card"      // Cards
className="text-foreground"         // Primary text
className="text-foreground-muted"   // Secondary text
className="text-accent"             // Crimson accent
className="text-accent-secondary"   // Teal accent
className="border-border"           // Standard border
className="border-crimson"          // Crimson border
```

---

## Shadows & Depth

```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.5)
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.6), 0 2px 4px -1px rgba(0, 0, 0, 0.4)
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.7), 0 4px 6px -2px rgba(0, 0, 0, 0.5)
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.8), 0 10px 10px -5px rgba(0, 0, 0, 0.6)
--shadow-crimson: 0 0 20px rgba(71, 0, 0, 0.4)    /* Crimson glow */
--shadow-teal: 0 0 20px rgba(17, 78, 98, 0.3)     /* Teal glow */
```

---

## Spacing System

```css
--spacing-xs: 0.25rem    /* 4px */
--spacing-sm: 0.5rem     /* 8px */
--spacing-md: 1rem       /* 16px */
--spacing-lg: 1.5rem     /* 24px */
--spacing-xl: 2rem       /* 32px */
--spacing-2xl: 3rem      /* 48px */
--spacing-3xl: 4rem      /* 64px */
```

---

## Border Radius

```css
--radius-sm: 0.25rem   /* 4px - Small elements */
--radius-md: 0.5rem    /* 8px - Buttons, inputs */
--radius-lg: 0.75rem   /* 12px - Cards */
--radius-xl: 1rem      /* 16px - Large cards */
--radius-full: 9999px  /* Circular badges */
```

---

## Transitions

```css
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1)
--transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1)
--transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1)
```

---

## Component Classes

### Cards

```css
.card {
  background: linear-gradient(135deg, var(--background-card), var(--background-elevated));
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-base);
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg), var(--shadow-crimson);
  border-color: var(--border-crimson);
}
```

### Buttons

#### Primary Button (Crimson CTA)
```css
.btn-primary {
  background: linear-gradient(135deg, var(--accent-primary), #5A0000);
  color: var(--text-primary);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: var(--shadow-md);
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-md);
  font-weight: 600;
  transition: all var(--transition-base);
}

.btn-primary:hover {
  background: linear-gradient(135deg, var(--accent-primary-hover), #7A0000);
  box-shadow: var(--shadow-lg), var(--shadow-crimson);
  transform: translateY(-1px);
}
```

#### Secondary Button (Teal Outline)
```css
.btn-secondary {
  background: transparent;
  color: var(--accent-secondary-hover);
  border: 1px solid var(--accent-secondary);
  box-shadow: var(--shadow-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-md);
  font-weight: 600;
  transition: all var(--transition-base);
}

.btn-secondary:hover {
  background: var(--accent-secondary);
  color: var(--text-primary);
  box-shadow: var(--shadow-md), var(--shadow-teal);
}
```

#### Ghost Button
```css
.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-default);
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
}

.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  border-color: var(--border-strong);
}
```

### Badges

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-full);
  font-size: var(--font-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wider);
}

.badge-primary {
  background: rgba(71, 0, 0, 0.2);
  color: #FF6B6B;
  border: 1px solid var(--accent-primary);
}

.badge-secondary {
  background: rgba(17, 78, 98, 0.2);
  color: #60A5FA;
  border: 1px solid var(--accent-secondary);
}
```

### Form Elements

```css
.input, .textarea, .select {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--background-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: var(--font-base);
  transition: all var(--transition-base);
}

.input:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(71, 0, 0, 0.2);
}

.label {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-size: var(--font-sm);
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
}
```

---

## Design Principles

### 1. Dark Foundation
- Always use the darkest backgrounds (Shadow Black, Pure Black, Obsidian)
- Create depth through layering lighter backgrounds
- Reserve bright colors for accents only

### 2. Crimson as Primary Accent
- Dark Crimson represents the wolf's bloodline and warrior spirit
- Use for primary CTAs, important alerts, and emphasis
- Apply crimson glows on hover for interactive elements

### 3. Steel Teal for Information
- Use for secondary actions, badges, and informational elements
- Represents technology, armor, and tactical readouts
- Pairs well with crimson without competing

### 4. Clear Visual Hierarchy
- Text: Primary > Secondary > Muted (decreasing contrast)
- Backgrounds: Base > Soft > Elevated > Card (increasing layering)
- Borders: Subtle > Default > Strong (increasing emphasis)

### 5. Tactical Interactions
- All interactive elements have clear hover states
- Use subtle transforms (translateY) for elevation
- Apply appropriate shadows (crimson for primary, teal for secondary)
- Maintain fast, responsive transitions

### 6. Military Precision
- Use uppercase text with wide letter-spacing for headings
- Apply monospace fonts for technical data
- Maintain consistent spacing and alignment
- Keep borders subtle but defined

---

## Usage Guidelines

### DO:
✅ Use crimson for primary CTAs and danger states
✅ Use teal for informational elements and secondary actions
✅ Layer backgrounds for depth (base → elevated → card)
✅ Apply subtle glows on hover for interactive elements
✅ Use uppercase + wide tracking for section headings
✅ Maintain high contrast for accessibility

### DON'T:
❌ Use bright backgrounds (except for rare inverse text scenarios)
❌ Mix too many accent colors in one section
❌ Apply crimson to large background areas
❌ Use low-contrast text on dark backgrounds
❌ Overcomplicate with excessive gradients
❌ Ignore hover states on interactive elements

---

## Accessibility

- **Contrast Ratios**: All text meets WCAG AA standards (minimum 4.5:1)
- **Focus States**: All interactive elements have visible focus rings (2px solid crimson)
- **Reduced Motion**: Respects prefers-reduced-motion media query
- **Screen Readers**: Use semantic HTML and sr-only classes where needed
- **Keyboard Navigation**: All interactive elements are keyboard accessible

---

## Implementation

### In globals.css
All design tokens are defined as CSS custom properties in `app/globals.css`

### In Tailwind
Extended Tailwind config maps semantic names to CSS variables in `tailwind.config.ts`

### In Components
Use Tailwind classes or utility classes defined in globals.css:

```tsx
// Tailwind classes
<div className="bg-background-card text-foreground border border-border rounded-lg p-lg">

// Utility classes
<div className="card">
  <button className="btn btn-primary">Action</button>
  <span className="badge badge-secondary">Info</span>
</div>
```

---

## Migration Guide

### Old Color → New Color Mapping

```
var(--wolf-pearl)     → var(--text-primary)
var(--wolf-smoke)     → var(--text-secondary)
var(--wolf-crimson)   → var(--accent-primary)
var(--wolf-steel)     → var(--border-default)
var(--wolf-obsidian)  → var(--background-base)
var(--wolf-charcoal)  → var(--background-card)
var(--wolf-ash)       → var(--background-elevated)

var(--graphite-50)    → var(--text-primary)
var(--accent-main)    → var(--accent-primary)
var(--accent-soft)    → var(--accent-secondary)
var(--foreground)     → var(--text-primary)
var(--background)     → var(--background-base)
```

---

**Strength. Honor. Death.**
*House Wolf Design System v2.0*
