import { Text, View } from 'react-native';

import { PressableNeomorph } from '@/components/ui/pressable-neomorph';
import { Neo } from '@/theme/colors';

type HomeHeaderProps = {
  streak: number;
};

/** Top bar: home icon · streak pill · avatar — all neumorphic press buttons. */
export function HomeHeader({ streak }: HomeHeaderProps) {
  return (
    <View className="mb-xl flex-row items-center gap-sm">
      <PressableNeomorph radius={15} className="h-[46px] w-[46px] items-center justify-center">
        <Text className="text-[19px]">🏠</Text>
      </PressableNeomorph>

      <View className="flex-1" />

      <PressableNeomorph
        radius={16}
        backgroundColor={Neo.surfaceMuted}
        className="flex-row items-center gap-xs px-md py-sm"
      >
        <Text className="text-[11px] font-extrabold tracking-wide text-neo-primary-deep">
          🔥 {streak} STREAK
        </Text>
      </PressableNeomorph>

      <PressableNeomorph radius={23} backgroundColor={Neo.primary} className="h-[46px] w-[46px]" />
    </View>
  );
}
