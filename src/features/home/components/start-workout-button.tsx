import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Canvas, Circle, RadialGradient, Shadow, vec } from '@shopify/react-native-skia';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Neo } from '@/theme/colors';

const SIZE = 168;
/** Canvas padding so the soft glow isn't clipped. */
const PAD = 46;
const CANVAS = SIZE + PAD * 2;
const RADIUS = SIZE / 2;
const CENTER_X = PAD + RADIUS;
const CENTER_Y = PAD + RADIUS;
/** Small downward shift of the face when pressed for a tactile feel. */
const SINK = 4;
const PRESS_SPRING = { damping: 15, stiffness: 400 } as const;
/** Glow ring extends slightly beyond the button edge for a soft halo. */
const GLOW_OFFSET = 6;
const GLOW_SIZE = SIZE + GLOW_OFFSET * 2;

type StartWorkoutButtonProps = {
  onPress?: () => void;
};

/** Circular soft-raised "START" button rendered with Skia. */
export function StartWorkoutButton({ onPress }: StartWorkoutButtonProps) {
  const [pressed, setPressed] = useState(false);
  const sink = pressed ? SINK : 0;

  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  const scaledStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        setPressed(true);
        scale.value = withSpring(0.98, PRESS_SPRING);
        glowOpacity.value = withSpring(0.4, PRESS_SPRING);
      }}
      onPressOut={() => {
        setPressed(false);
        scale.value = withSpring(1, PRESS_SPRING);
        glowOpacity.value = withSpring(0, PRESS_SPRING);
      }}
      style={{ width: SIZE, height: SIZE, marginTop: 24, marginBottom: 4 }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: -GLOW_OFFSET,
            top: -GLOW_OFFSET,
            width: GLOW_SIZE,
            height: GLOW_SIZE,
            borderRadius: GLOW_SIZE / 2,
            borderWidth: 2,
            borderColor: Neo.primary,
          },
          glowStyle,
        ]}
      />
      <Animated.View style={[{ width: SIZE, height: SIZE }, scaledStyle]}>
        <Canvas
          pointerEvents="none"
          style={{ position: 'absolute', left: -PAD, top: -PAD, width: CANVAS, height: CANVAS }}
        >
          <Circle cx={CENTER_X} cy={CENTER_Y + sink} r={RADIUS}>
            <RadialGradient
              c={vec(CENTER_X - RADIUS * 0.25, CENTER_Y - RADIUS * 0.35 + sink)}
              r={RADIUS * 1.35}
              colors={[Neo.primaryLight, Neo.primary, Neo.primaryDeep]}
            />
            <Shadow
              dx={0}
              dy={pressed ? 8 : 22}
              blur={pressed ? 16 : 32}
              color="rgba(124,92,252,0.45)"
            />
            {pressed ? <Shadow inner dx={0} dy={6} blur={12} color="rgba(45,28,120,0.4)" /> : null}
          </Circle>
        </Canvas>

        <View
          className="items-center justify-center"
          style={{ width: SIZE, height: SIZE, transform: [{ translateY: sink }] }}
        >
          <View
            style={{
              width: 0,
              height: 0,
              borderTopWidth: 17,
              borderBottomWidth: 17,
              borderLeftWidth: 28,
              borderTopColor: 'transparent',
              borderBottomColor: 'transparent',
              borderLeftColor: '#FFFFFF',
              marginLeft: 8,
            }}
          />
          <Text className="mt-xs text-[15px] font-extrabold tracking-[1.5px] text-white">
            START
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}
