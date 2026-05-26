import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';

import { Neo } from '@/theme/colors';

export default function TabLayout() {
  return (
    <NativeTabs backgroundColor={Neo.bgApp}>
      <NativeTabs.Trigger name="index">
        <Label>Workout</Label>
        <Icon sf="dumbbell.fill" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="exercises">
        <Label>Exercises</Label>
        <Icon sf="figure.strengthtraining.traditional" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <Label>History</Label>
        <Icon sf="clock.arrow.circlepath" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Label>Profile</Label>
        <Icon sf="person.fill" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
