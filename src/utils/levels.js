export const RANKS = [
  { name: 'Recruit',    min: 0    },
  { name: 'Apprentice', min: 150  },
  { name: 'Journeyman', min: 400  },
  { name: 'Expert',     min: 800  },
  { name: 'Master',     min: 1400 },
  { name: 'Legend',     min: 2200 },
];

export function getPlayerLevel(xp) {
  let rankIdx = 0;
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i].min) { rankIdx = i; break; }
  }
  const rank = RANKS[rankIdx];
  const next = RANKS[rankIdx + 1] || null;
  const xpInLevel  = xp - rank.min;
  const xpForLevel = next ? next.min - rank.min : null;
  const progress   = next ? Math.min(100, Math.round((xpInLevel / xpForLevel) * 100)) : 100;
  return { rank: rank.name, rankIdx, next: next?.name || null, xpInLevel, xpForLevel, progress };
}
