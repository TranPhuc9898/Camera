import { View } from 'react-native';

import type { WorkoutStat } from '../types';
import { WorkoutStatCard } from './workout-stat-card';

type WorkoutStatGridProps = {
  stats: WorkoutStat[];
};

/** 2×2 grid of stat tiles. Splits via slice() to satisfy noUncheckedIndexedAccess. */
export function WorkoutStatGrid({ stats }: WorkoutStatGridProps) {
  const rows = [stats.slice(0, 2), stats.slice(2, 4)];

  return (
    <View className="gap-lg">
      {rows.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} className="flex-row gap-lg">
          {row.map((stat) => (
            <WorkoutStatCard key={stat.id} stat={stat} />
          ))}
        </View>
      ))}
    </View>
  );
}
