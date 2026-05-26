import { Text, View } from 'react-native';

import { Neomorph } from '@/components/ui/neomorph';
import { Neo } from '@/theme/colors';

import type { HomeSession } from '../types';
import { StartWorkoutButton } from './start-workout-button';

type RecommendedSessionCardProps = {
  session: HomeSession;
  onStart?: () => void;
};

/** Hero card: recommended-session badge, title, and the START button. */
export function RecommendedSessionCard({ session, onStart }: RecommendedSessionCardProps) {
  return (
    <Neomorph
      radius={30}
      backgroundColor={Neo.cardLayer}
      shadowRadius={26}
      className="mb-xl items-center px-xl pb-3xl pt-2xl"
    >
      <View className="rounded-full bg-neo-yellow px-md py-sm">
        <Text className="text-[11px] font-extrabold tracking-wide text-neo-yellow-ink">
          {session.badge}
        </Text>
      </View>

      <Text className="mt-lg text-center text-[25px] font-extrabold leading-[30px] text-neo-strong">
        {session.titleTop}
        {'\n'}
        <Text className="text-neo-primary">{session.titleAccent}</Text>
      </Text>

      <StartWorkoutButton onPress={onStart} />
    </Neomorph>
  );
}
