import { useState } from 'react';
import { View, type LayoutChangeEvent, type ViewProps } from 'react-native';

import { Canvas, RoundedRect, Shadow } from '@shopify/react-native-skia';

import { Neo } from '@/theme/colors';
import { AppShadows, type NeoVariantKey } from '@/theme/shadows';

/** Extra canvas margin so the outer drop-shadow isn't clipped by the View bounds. */
const SHADOW_SPREAD = 44;

type NeoSurfaceProps = ViewProps & {
  variant?: NeoVariantKey;
  radius?: number;
  surfaceColor?: string;
};

type Size = { width: number; height: number };

/**
 * Neumorphic surface — draws a rounded rect with two Skia shadows
 * (dark bottom-right + light top-left). `pressed` variant uses inset shadows.
 */
export function NeoSurface({
  variant = 'raised',
  radius = 24,
  surfaceColor = Neo.surface,
  children,
  ...rest
}: NeoSurfaceProps) {
  const [size, setSize] = useState<Size | null>(null);
  const { dark, light } = AppShadows[variant];
  const inner = variant === 'pressed';

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) =>
      prev && prev.width === width && prev.height === height ? prev : { width, height },
    );
  };

  return (
    <View onLayout={handleLayout} {...rest}>
      {size ? (
        <Canvas
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: -SHADOW_SPREAD,
            top: -SHADOW_SPREAD,
            width: size.width + SHADOW_SPREAD * 2,
            height: size.height + SHADOW_SPREAD * 2,
          }}
        >
          <RoundedRect
            x={SHADOW_SPREAD}
            y={SHADOW_SPREAD}
            width={size.width}
            height={size.height}
            r={radius}
            color={surfaceColor}
          >
            <Shadow dx={dark.dx} dy={dark.dy} blur={dark.blur} color={dark.color} inner={inner} />
            <Shadow
              dx={light.dx}
              dy={light.dy}
              blur={light.blur}
              color={light.color}
              inner={inner}
            />
          </RoundedRect>
        </Canvas>
      ) : null}
      {children}
    </View>
  );
}
