const MS_PER_DAY = 86_400_000;
const LIFE_MINUTES_PER_CIG = 20;

export type AttemptEconomics = {
  cigarettesPerDay: number;
  cigarettesPerPack: number;
  packPrice: number;
};

export type AttemptImpactSnapshot = {
  durationSeconds: number;
  cigarettesAvoided: number;
  moneySaved: number;
  lifeMinutesGained: number;
  slipCigarettesSmoked: number;
};

export function parsePackPrice(value: string | null | undefined): number {
  if (!value?.trim()) return 0;
  const parsed = Number.parseFloat(value.replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function computeAttemptImpact(
  economics: AttemptEconomics,
  startedAt: Date,
  endedAt: Date,
  slipCigarettesSmoked: number,
): AttemptImpactSnapshot {
  const durationMs = Math.max(0, endedAt.getTime() - startedAt.getTime());
  const durationSeconds = Math.floor(durationMs / 1000);
  const gross =
    (Math.max(0, economics.cigarettesPerDay) * durationMs) / MS_PER_DAY;
  const avoided = Math.max(
    0,
    Math.floor(gross) - Math.max(0, slipCigarettesSmoked),
  );
  const perPack = Math.max(1, economics.cigarettesPerPack);

  return {
    durationSeconds,
    cigarettesAvoided: avoided,
    moneySaved: (avoided / perPack) * economics.packPrice,
    lifeMinutesGained: avoided * LIFE_MINUTES_PER_CIG,
    slipCigarettesSmoked: Math.max(0, slipCigarettesSmoked),
  };
}
