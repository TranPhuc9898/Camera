import { Text, View } from 'react-native';

import { PressableNeomorph } from '@/components/ui/pressable-neomorph';
import { Neo } from '@/theme/colors';

import type { HomeSetup } from '../types';

type DefaultSetupSectionProps = {
  setup: HomeSetup;
};

/** Section header above the stat grid: title + EDIT PLAN pill + subtitle. */
export function DefaultSetupSection({ setup }: DefaultSetupSectionProps) {
  return (
    <View className="mb-lg">
      <View className="flex-row items-center">
        <Text className="flex-1 text-[19px] font-extrabold text-neo-strong">{setup.title}</Text>
        <PressableNeomorph radius={16} backgroundColor={Neo.surfaceMuted} className="px-md py-sm">
          <Text className="text-[11px] font-extrabold tracking-wide text-neo-primary-deep">
            EDIT PLAN
          </Text>
        </PressableNeomorph>
      </View>
      <Text className="mt-xs text-[12px] text-neo-faint">{setup.subtitle}</Text>
    </View>
  );
}
