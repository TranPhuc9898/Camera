import { useState } from 'react';
import { View, type LayoutChangeEvent, type ViewProps } from 'react-native';

import { Canvas, RoundedRect, Shadow } from '@shopify/react-native-skia';

/** Canvas padding so the soft shadows aren't clipped by the View bounds. */
const CANVAS_PAD = 80;

/** One Skia shadow layer — stack many of these for pro-grade depth. */
export type ShadowLayer = {
  dx: number;
  dy: number;
  blur: number;
  color: string;
  /** When true, renders as inset shadow (pressed-in look). */
  inner?: boolean;
};

export type NeomorphProps = ViewProps & {
  /** Inset shadows — the "pressed into the surface" look. Ignored when `shadowLayers` is set. */
  inner?: boolean;
  /** Swap which corner gets the dark vs the light shadow. Ignored when `shadowLayers` is set. */
  swapShadows?: boolean;
  /** Corner radius of the surface. */
  radius?: number;
  /** Fill color — should match (or sit near) the screen background. */
  backgroundColor?: string;
  /** Softness: shadow blur. The offset is derived as ~0.5×. Ignored when `shadowLayers` is set. */
  shadowRadius?: number;
  lightShadowColor?: string;
  darkShadowColor?: string;
  /**
   * Custom shadow stack — render each layer in order. When provided, overrides
   * the default 2-layer (`darkShadowColor` + `lightShadowColor`) behaviour and
   * the `inner` / `swapShadows` / `shadowRadius` props are ignored.
   */
  shadowLayers?: ShadowLayer[];
};

type Size = { width: number; height: number };

/**
 * Neumorphic surface rendered with Skia. By default renders a 2-layer
 * (dark + light) shadow that makes the surface read as raised; `inner`
 * flips both to read as pressed in. For pro-grade depth, pass a custom
 * `shadowLayers` array (3-5+ layers with mixed offsets, blurs, and tints).
 */
export function Neomorph({
  inner = false,
  swapShadows = false,
  radius = 22,
  backgroundColor = '#FFFFFF',
  shadowRadius = 18,
  lightShadowColor = 'rgba(255,255,255,0.95)',
  darkShadowColor = 'rgba(174,174,200,0.5)',
  shadowLayers,
  children,
  ...rest
}: NeomorphProps) {
  const [size, setSize] = useState<Size | null>(null);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) =>
      prev && prev.width === width && prev.height === height ? prev : { width, height },
    );
  };

  const layers: ShadowLayer[] =
    shadowLayers ??
    (() => {
      const dist = shadowRadius * (inner ? 0.42 : 0.5);
      const blur = inner ? shadowRadius * 0.8 : shadowRadius;
      const darkOffset = swapShadows ? -dist : dist;
      const lightOffset = swapShadows ? dist : -dist;
      return [
        { dx: darkOffset, dy: darkOffset, blur, color: darkShadowColor, inner },
        { dx: lightOffset, dy: lightOffset, blur, color: lightShadowColor, inner },
      ];
    })();

  return (
    <View onLayout={handleLayout} {...rest}>
      {size ? (
        <Canvas
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: -CANVAS_PAD,
            top: -CANVAS_PAD,
            width: size.width + CANVAS_PAD * 2,
            height: size.height + CANVAS_PAD * 2,
          }}
        >
          <RoundedRect
            x={CANVAS_PAD}
            y={CANVAS_PAD}
            width={size.width}
            height={size.height}
            r={radius}
            color={backgroundColor}
          >
            {layers.map((l, i) => (
              <Shadow
                key={i}
                dx={l.dx}
                dy={l.dy}
                blur={l.blur}
                color={l.color}
                inner={l.inner ?? false}
              />
            ))}
          </RoundedRect>
        </Canvas>
      ) : null}
      {children}
    </View>
  );
}
