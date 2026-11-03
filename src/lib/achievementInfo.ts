import { ACHIEVEMENTS } from "./game-defs";
export const ACHIEVEMENT_INFO: Record<string, { title: string; desc: string; icon: string }> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.key, a]));
