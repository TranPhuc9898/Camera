export type WorkoutStat = {
  id: string;
  icon: string;
  label: string;
  value: string;
  tag?: string;
  foot?: string;
  progress?: number;
};

export type HomeSession = {
  badge: string;
  titleTop: string;
  titleAccent: string;
};

export type HomeSetup = {
  title: string;
  subtitle: string;
};

export type HomeData = {
  streak: number;
  session: HomeSession;
  setup: HomeSetup;
  stats: WorkoutStat[];
};
