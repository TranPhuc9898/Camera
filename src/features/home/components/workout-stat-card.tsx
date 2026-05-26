import { Text, View } from 'react-native';

import { Neomorph } from '@/components/ui/neomorph';
import { PressableNeomorph } from '@/components/ui/pressable-neomorph';
import { Neo } from '@/theme/colors';
import {
  PREMIUM_CARD_SHADOWS,
  PREMIUM_INSET_SHADOWS,
  PREMIUM_PILL_SHADOWS,
  PREMIUM_PRESSED_SHADOWS,
} from '@/theme/shadows';

import type { WorkoutStat } from '../types';

type WorkoutStatCardProps = {
  stat: WorkoutStat;
};

/** One 2×2 grid tile — premium neumorphic surface with multi-layer shadows. */
export function WorkoutStatCard({ stat }: WorkoutStatCardProps) {
  return (
    <View className="flex-1">
      <PressableNeomorph
        radius={26}
        backgroundColor={Neo.bgApp}
        shadowLayers={PREMIUM_CARD_SHADOWS}
        pressedShadowLayers={PREMIUM_PRESSED_SHADOWS}
        className="p-xl"
        style={{ minHeight: 148 }}
      >
        <View className="flex-row items-start justify-between">
          <Neomorph
            radius={12}
            backgroundColor={Neo.bgApp}
            shadowLayers={PREMIUM_INSET_SHADOWS}
            style={{ width: 40, height: 40 }}
            className="items-center justify-center"
          >
            <Text className="text-[16px]">{stat.icon}</Text>
          </Neomorph>
          <Text className="text-[10px] font-extrabold tracking-wider text-neo-faint">
            {stat.label}
          </Text>
        </View>

        <Text className="mt-auto text-[38px] font-extrabold text-neo-primary-deep">
          {stat.value}
        </Text>

        {stat.tag ? (
          <Neomorph
            radius={999}
            backgroundColor={Neo.bgApp}
            shadowLayers={PREMIUM_PILL_SHADOWS}
            className="mt-sm self-start px-md py-xs"
          >
            <Text className="text-[9px] font-extrabold text-neo-primary-deep">{stat.tag}</Text>
          </Neomorph>
        ) : null}

        {stat.foot ? (
          <Text className="mt-sm text-[10px] font-bold text-neo-faint">{stat.foot}</Text>
        ) : null}

        {stat.progress != null ? (
          <Neomorph
            radius={999}
            backgroundColor={Neo.bgApp}
            shadowLayers={PREMIUM_INSET_SHADOWS}
            style={{ height: 10, marginTop: 12 }}
          >
            <View
              className="h-full rounded-full"
              style={{
                width: `${Math.round(stat.progress * 100)}%`,
                backgroundColor: Neo.primary,
              }}
            />
          </Neomorph>
        ) : null}
      </PressableNeomorph>
    </View>
  );
}
