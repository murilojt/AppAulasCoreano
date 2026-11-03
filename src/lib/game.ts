import { prisma } from "./prisma";
import { ACHIEVEMENTS } from "./game-defs";
export { ACHIEVEMENTS };

export const MAX_HEARTS = 5;
export const HEART_REGEN_MS = 30 * 60 * 1000;
export const XP_PER_LEVEL = 150;
export const SRS_DAYS = [1, 2, 4, 8, 16, 32];

export function todayStr(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
}
function dayDiff(a: string, b: string) {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
}

export function levelFromXp(xp: number) {
  return { level: Math.floor(xp / XP_PER_LEVEL) + 1, into: xp % XP_PER_LEVEL, size: XP_PER_LEVEL };
}

/** Corações atuais considerando a regeneração (1 a cada 30 min). */
export function heartsNow(u: { hearts: number; heartsUpdated: Date }, now = new Date()) {
  if (u.hearts >= MAX_HEARTS) return { hearts: MAX_HEARTS, nextMs: 0, updated: now };
  const elapsed = now.getTime() - u.heartsUpdated.getTime();
  const gained = Math.floor(elapsed / HEART_REGEN_MS);
  const hearts = Math.min(MAX_HEARTS, u.hearts + gained);
  if (hearts >= MAX_HEARTS) return { hearts, nextMs: 0, updated: now };
  const updated = new Date(u.heartsUpdated.getTime() + gained * HEART_REGEN_MS);
  return { hearts, nextMs: HEART_REGEN_MS - (now.getTime() - updated.getTime()), updated };
}

export async function getUserState(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  const h = heartsNow(user);
  // streak quebrado se passou mais de 1 dia sem atividade
  const today = todayStr();
  const streakAlive = user.lastActiveDate && dayDiff(user.lastActiveDate, today) <= 1;
  return {
    id: user.id, name: user.name, email: user.email, xp: user.xp,
    streak: streakAlive ? user.streak : 0, bestStreak: user.bestStreak, lastActiveDate: user.lastActiveDate,
    hearts: h.hearts, nextHeartMs: h.nextMs, createdAt: user.createdAt,
    ...levelFromXp(user.xp),
  };
}



async function levelComplete(userId: string, level: number) {
  const total = await prisma.lesson.count({ where: { level, kind: "lesson" } });
  if (!total) return false;
  const done = await prisma.lessonProgress.count({ where: { userId, lesson: { level, kind: "lesson" } } });
  return done >= total;
}

export async function awardAchievements(userId: string) {
  const [user, have, lessonsDone, perfect, simulado, reviewOk, chats, l0, l1, l2] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.achievement.findMany({ where: { userId } }),
    prisma.lessonProgress.count({ where: { userId, lesson: { kind: "lesson" } } }),
    prisma.lessonProgress.count({ where: { userId, bestScore: 100 } }),
    prisma.lessonProgress.count({ where: { userId, lesson: { kind: "simulado" } } }),
    prisma.wordReview.count({ where: { userId, box: { gte: 1 } } }),
    prisma.conversation.count({ where: { userId } }),
    levelComplete(userId, 0), levelComplete(userId, 1), levelComplete(userId, 2),
  ]);
  const has = new Set(have.map((a) => a.key));
  const checks: Record<string, boolean> = {
    "first-lesson": lessonsDone >= 1, "hangeul-master": l0, "streak-3": user.bestStreak >= 3, "streak-7": user.bestStreak >= 7,
    "streak-30": user.bestStreak >= 30, "xp-100": user.xp >= 100, "xp-500": user.xp >= 500, "xp-1500": user.xp >= 1500,
    perfect: perfect >= 1, "lessons-10": lessonsDone >= 10, "lessons-40": lessonsDone >= 40, "review-10": reviewOk >= 10,
    "first-chat": chats >= 1, "level-1": l1, "level-2": l2, simulado: simulado >= 1,
  };
  const fresh = ACHIEVEMENTS.filter((a) => checks[a.key] && !has.has(a.key));
  for (const a of fresh) await prisma.achievement.create({ data: { userId, key: a.key } }).catch(() => {});
  return fresh;
}

/** Registra atividade do dia: streak + XP diário. */
export async function recordActivity(userId: string, xp: number, lessons = 0) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const today = todayStr();
  let streak = user.streak;
  if (user.lastActiveDate !== today) {
    streak = user.lastActiveDate && dayDiff(user.lastActiveDate, today) === 1 ? user.streak + 1 : 1;
  }
  await prisma.user.update({
    where: { id: userId },
    data: { xp: { increment: xp }, streak, bestStreak: Math.max(user.bestStreak, streak), lastActiveDate: today },
  });
  await prisma.dailyActivity.upsert({
    where: { userId_date: { userId, date: today } },
    create: { userId, date: today, xp, lessons },
    update: { xp: { increment: xp }, lessons: { increment: lessons } },
  });
  return streak;
}

export async function applyHearts(userId: string, delta: number) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const now = new Date();
  const cur = heartsNow(user, now);
  const hearts = Math.max(0, Math.min(MAX_HEARTS, cur.hearts + delta));
  const updated = cur.hearts >= MAX_HEARTS ? now : cur.updated;
  await prisma.user.update({ where: { id: userId }, data: { hearts, heartsUpdated: hearts >= MAX_HEARTS ? now : updated } });
  return hearts;
}

export async function addMistakes(userId: string, items: { ko: string; rom: string; pt: string }[]) {
  for (const w of items) {
    if (!w.ko) continue;
    await prisma.wordReview.upsert({
      where: { userId_ko: { userId, ko: w.ko } },
      create: { userId, ko: w.ko, rom: w.rom, pt: w.pt, box: 0, lapses: 1, dueAt: new Date(Date.now() + 10 * 60000) },
      update: { box: 0, lapses: { increment: 1 }, dueAt: new Date(Date.now() + 10 * 60000), lastSeen: new Date() },
    });
  }
}
