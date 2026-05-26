import { ScrollView } from 'react-native';

import { DefaultSetupSection } from '../components/default-setup-section';
import { HomeHeader } from '../components/home-header';
import { RecommendedSessionCard } from '../components/recommended-session-card';
import { WorkoutStatGrid } from '../components/workout-stat-grid';
import { homeData } from '../data';

/** Workout Home screen — neumorphic UI rendered with Skia surfaces. */
export function HomeScreen() {
  const { streak, session, setup, stats } = homeData;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustContentInsets={false}
      contentContainerStyle={{
        paddingTop: 8,
        paddingBottom: 96,
        paddingHorizontal: 12,
      }}
    >
      <HomeHeader streak={streak} />
      <RecommendedSessionCard session={session} />
      <DefaultSetupSection setup={setup} />
      <WorkoutStatGrid stats={stats} />
    </ScrollView>
  );
}
