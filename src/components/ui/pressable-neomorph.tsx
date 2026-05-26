import { useState } from 'react';
import { Pressable, type PressableProps } from 'react-native';

import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Neomorph, type NeomorphProps, type ShadowLayer } from './neomorph';

const PRESS_SPRING = { damping: 15, stiffness: 400 } as const;

export type PressableNeomorphProps = Omit<NeomorphProps, 'inner'> & {
  /** Fired on a completed tap. */
  onPress?: PressableProps['onPress'];
  /** Disable both the press-in effect and the onPress callback. */
  disabled?: boolean;
  /** Class applied to the outer Pressable — use for layout (e.g. "flex-1"). */
  containerClassName?: string;
  /**
   * Custom shadow stack to swap in while pressed. Only used when `shadowLayers`
   * is also provided — falls back to the default 2-layer inset behaviour
   * otherwise. Typical pairing: `PREMIUM_CARD_SHADOWS` + `PREMIUM_PRESSED_SHADOWS`.
   */
  pressedShadowLayers?: ShadowLayer[];
};

/**
 * Neumorphic surface that presses inward on touch. Wraps {@link Neomorph}
 * with a Pressable that flips between raised and pressed states.
 *
 * For custom multi-layer stacks, pass `shadowLayers` (raised) and
 * `pressedShadowLayers` (pressed). For the simple 2-layer mode, omit both
 * and the underlying `Neomorph` toggles `inner` automatically.
 */
export function PressableNeomorph({
  onPress,
  disabled = false,
  containerClassName,
  children,
  shadowLayers,
  pressedShadowLayers,
  ...neomorphProps
}: PressableNeomorphProps) {
  const [pressed, setPressed] = useState(false);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const activeLayers = shadowLayers
    ? pressed && !disabled && pressedShadowLayers
      ? pressedShadowLayers
      : shadowLayers
    : undefined;

  return (
    <Pressable
      className={containerClassName}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        setPressed(true);
        scale.value = withSpring(0.98, PRESS_SPRING);
      }}
      onPressOut={() => {
        setPressed(false);
        scale.value = withSpring(1, PRESS_SPRING);
      }}
    >
      <Animated.View style={animatedStyle}>
        <Neomorph
          inner={!shadowLayers && pressed && !disabled}
          shadowLayers={activeLayers}
          {...neomorphProps}
        >
          {children}
        </Neomorph>
      </Animated.View>
    </Pressable>
  );
}
