/**
 * Neumorphism shadow tokens — two layers per surface.
 * Consumed by Skia <Shadow> in the NeoSurface component.
 */

import type { ShadowLayer } from '@/components/ui/neomorph';

export type NeoShadowLayer = {
  dx: number;
  dy: number;
  blur: number;
  color: string;
};

export type NeoVariantKey = 'raised' | 'flat' | 'pressed';

export const AppShadows: Record<NeoVariantKey, { dark: NeoShadowLayer; light: NeoShadowLayer }> = {
  raised: {
    dark: { dx: 9, dy: 9, blur: 8, color: 'rgba(174,174,200,0.55)' },
    light: { dx: -9, dy: -9, blur: 8, color: 'rgba(255,255,255,0.95)' },
  },
  flat: {
    dark: { dx: 5, dy: 5, blur: 5, color: 'rgba(174,174,200,0.40)' },
    light: { dx: -4, dy: -4, blur: 5, color: 'rgba(255,255,255,0.85)' },
  },
  pressed: {
    dark: { dx: 6, dy: 6, blur: 5, color: 'rgba(174,174,200,0.55)' },
    light: { dx: -6, dy: -6, blur: 5, color: 'rgba(255,255,255,0.95)' },
  },
} as const;

/**
 * Pro-grade raised card shadow — 5-layer stack tuned for the Neo.bgApp surface.
 *
 *  1. Far soft light glow (top-left)        — ambient radiance
 *  2. Close sharp light highlight           — defined rim on the lit edge
 *  3. Close sharp shadow (bottom-right)     — grounds the card on the surface
 *  4. Far soft shadow tinted with primary   — ambient mood, ties into the theme
 *  5. Inner top rim highlight               — subtle glass edge at the very top
 *
 * Reusable across cards, tiles, hero surfaces. Pair with `PREMIUM_PRESSED_SHADOWS`
 * on a `PressableNeomorph` for a tactile press-in transition.
 */
export const PREMIUM_CARD_SHADOWS: ShadowLayer[] = [
  { dx: -20, dy: -20, blur: 35, color: 'rgba(255,255,255,0.95)' },
  { dx: -3, dy: -3, blur: 6, color: 'rgba(255,255,255,0.7)' },
  { dx: 5, dy: 8, blur: 12, color: 'rgba(60,50,110,0.18)' },
  { dx: 22, dy: 26, blur: 45, color: 'rgba(124,92,252,0.18)' },
  { dx: 0, dy: 1, blur: 1, color: 'rgba(255,255,255,0.5)', inner: true },
];

/** Pressed-in variant of {@link PREMIUM_CARD_SHADOWS} — for tap feedback. */
export const PREMIUM_PRESSED_SHADOWS: ShadowLayer[] = [
  { dx: 6, dy: 6, blur: 10, color: 'rgba(60,50,110,0.28)', inner: true },
  { dx: -4, dy: -4, blur: 8, color: 'rgba(255,255,255,0.9)', inner: true },
];

/** Inset hollow — for icon "wells", progress tracks, input fields. */
export const PREMIUM_INSET_SHADOWS: ShadowLayer[] = [
  { dx: 2, dy: 2, blur: 4, color: 'rgba(60,50,110,0.25)', inner: true },
  { dx: -1, dy: -1, blur: 2, color: 'rgba(255,255,255,0.8)', inner: true },
];

/** Tiny raised pill — for tag chips, badges. Softer than `PREMIUM_CARD_SHADOWS`. */
export const PREMIUM_PILL_SHADOWS: ShadowLayer[] = [
  { dx: -2, dy: -2, blur: 5, color: 'rgba(255,255,255,0.9)' },
  { dx: 3, dy: 4, blur: 8, color: 'rgba(124,92,252,0.22)' },
];
