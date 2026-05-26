import type { HomeData } from './types';

/** Static demo content for the workout Home screen. */
export const homeData: HomeData = {
  streak: 12,
  session: {
    badge: 'RECOMMENDED SESSION',
    titleTop: 'LEG DAY:',
    titleAccent: 'HYPERTROPHY',
  },
  setup: {
    title: 'DEFAULT SETUP',
    subtitle: 'Targeting moderate muscle growth',
  },
  stats: [
    {
      id: 'sets',
      icon: '📦',
      label: 'SETS',
      value: '4',
      tag: '⚡ XP BOOST',
    },
    {
      id: 'reps',
      icon: '🔁',
      label: 'REPS',
      value: '12',
      foot: 'GOAL: 10-15',
    },
    {
      id: 'pace',
      icon: '⏱️',
      label: 'PACE',
      value: '3:1:1',
      tag: 'COMBO X2',
    },
    {
      id: 'recovery',
      icon: '💤',
      label: 'RECOVERY',
      value: '90s',
      progress: 0.62,
    },
  ],
};
