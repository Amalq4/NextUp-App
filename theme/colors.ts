/**
 * colors.ts — Theatre-Inspired Design Palette
 *
 * Every colour used in the app is defined here and imported as `Colors`.
 * No hex values should appear anywhere else in the codebase.
 *
 * Design system palette:
 *   Gold    #C9A24D — primary accent, stars, active states
 *   Cream   #E8DCC2 — all body text (replaces white)
 *   Black   #1C1C1C — primary background
 *   Velvet  #7A0F14 — danger / destructive actions
 *
 * Opacity variants (e.g. accentSoft, textSecondary) are derived from the
 * base colours so the palette stays visually coherent across light/dark states.
 */

const Colors = {
  // ── Brand primitives ──────────────────────────────────────────────────────
  gold: '#C9A24D',       // Primary accent — gold foil theatre feel
  cream: '#E8DCC2',      // Primary text colour — warm cream instead of white
  black: '#1C1C1C',      // App background — deep charcoal black
  velvet: '#7A0F14',     // Danger / destructive — deep velvet red

  // ── Backgrounds ───────────────────────────────────────────────────────────
  background: '#1C1C1C',       // Default screen background
  backgroundDark: '#151515',   // Slightly darker surfaces (drawer, modals)
  backgroundDeep: '#111111',   // Deepest black for contrast layers

  // ── Surfaces & Cards ──────────────────────────────────────────────────────
  surface: '#2A2A2A',                        // Card and input backgrounds
  surfaceBorder: 'rgba(201,162,77,0.12)',    // Subtle gold-tinted card borders
  glass: '#2A2A2A',                          // Frosted-glass style panels
  glassBorder: 'rgba(232,220,194,0.1)',      // Faint cream border for glass panels

  // ── Typography ────────────────────────────────────────────────────────────
  text: '#E8DCC2',                           // Primary body text (cream)
  textSecondary: 'rgba(232,220,194,0.7)',    // Supporting / label text
  textMuted: 'rgba(232,220,194,0.5)',        // Placeholder and disabled text

  // ── Accent (Gold) Variants ────────────────────────────────────────────────
  accent: '#C9A24D',                         // Same as gold — alias for semantic use
  accentSoft: 'rgba(201,162,77,0.15)',       // Soft gold tint for icon backgrounds
  accentBorder: 'rgba(201,162,77,0.35)',     // Highlighted border colour

  // ── Danger (Velvet) Variants ──────────────────────────────────────────────
  danger: '#7A0F14',                         // Destructive action text / icons
  dangerBg: 'rgba(122,15,20,0.2)',           // Soft red background for danger buttons
  dangerBorder: 'rgba(122,15,20,0.4)',       // Border for danger button outlines

  // ── Miscellaneous ─────────────────────────────────────────────────────────
  star: '#C9A24D',                           // Star / rating icon colour (matches gold)

  // ── Form Inputs ───────────────────────────────────────────────────────────
  inputBg: '#2A2A2A',                        // Text input background
  inputBorder: 'rgba(232,220,194,0.12)',     // Default input border

  // ── Layout ────────────────────────────────────────────────────────────────
  divider: 'rgba(232,220,194,0.08)',         // Thin horizontal rule between items
  overlay: 'rgba(0,0,0,0.8)',               // Backdrop behind modals and drawer

  // ── Tab Bar ───────────────────────────────────────────────────────────────
  tabActive: '#C9A24D',                      // Active tab icon + label
  tabInactive: 'rgba(232,220,194,0.5)',      // Inactive tab icon + label

  // ── Legacy / Alias names kept for backward compatibility ──────────────────
  white: '#E8DCC2',        // Mapped to cream — never use pure white (#FFF)
  tan: '#C9A24D',          // Alias for gold
  slateGray: 'rgba(232,220,194,0.5)',  // Alias for textMuted
  spaceCadet: '#1C1C1C',   // Alias for background
  coffee: '#C9A24D',       // Alias for gold
  caputMortuum: '#7A0F14', // Alias for velvet/danger
};

export default Colors;
