export interface MaturityLevelData {
  level: 1 | 2 | 3 | 4 | 5;
  label: string;
  icon: string;
  description: string;
  maturityScore: number; // 0-100
  progressToNext: number | null; // 0-100, null at max
  nextLabel: string | null;
}

const LEVELS = [
  { level: 1 as const, min: 0,  max: 24,  label: "Débutant",       icon: "🌱", description: "Tu poses les premières briques." },
  { level: 2 as const, min: 25, max: 44,  label: "Régulier",        icon: "🎮", description: "Tu construis une routine solide." },
  { level: 3 as const, min: 45, max: 64,  label: "Établi",          icon: "⚡", description: "Ton audience commence à te reconnaître." },
  { level: 4 as const, min: 65, max: 79,  label: "Influent",        icon: "🔥", description: "Tu maîtrises ton format." },
  { level: 5 as const, min: 80, max: 100, label: "Pro potentiel",   icon: "🏆", description: "Tu as les fondations pour scaler." },
];

export function computeMaturityLevel(
  streamScore: number,
  totalEndedSessions: number,
): MaturityLevelData {
  const sessionScore = Math.min(100, totalEndedSessions * 2);
  const maturityScore = Math.round(streamScore * 0.6 + sessionScore * 0.4);

  const currentLevel =
    LEVELS.find((l) => maturityScore <= l.max) ?? LEVELS[LEVELS.length - 1];
  const nextLevel = LEVELS.find((l) => l.level === (currentLevel.level as number) + 1) ?? null;

  let progressToNext: number | null = null;
  if (nextLevel) {
    const range = nextLevel.min - currentLevel.min;
    const progress = maturityScore - currentLevel.min;
    progressToNext = range > 0 ? Math.min(100, Math.round((progress / range) * 100)) : 100;
  }

  return {
    level: currentLevel.level,
    label: currentLevel.label,
    icon: currentLevel.icon,
    description: currentLevel.description,
    maturityScore,
    progressToNext,
    nextLabel: nextLevel?.label ?? null,
  };
}
