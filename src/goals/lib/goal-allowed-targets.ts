import { BADGE_DEFINITIONS } from '../../badges/lib/badge-definitions';
import type { GoalType } from '../goals.constants';

export type GoalProgressSnapshot = {
  moneySaved: number;
  smokeFreeDays: number;
  cigarettesAvoided: number;
};

export type GoalEconomics = {
  cigarettesPerDay: number;
  cigarettesPerPack: number;
  packPrice: number;
};

const TIER_MIN_DAYS = [7, 7, 14, 14, 30, 60, 90, 180, 365, 500, 730, 1000] as const;

export function resolveBadgeTierIndex(earnedBadgeIds: readonly string[]): number {
  let highest = 0;

  for (let i = 0; i < BADGE_DEFINITIONS.length; i++) {
    if (earnedBadgeIds.includes(BADGE_DEFINITIONS[i].id)) {
      highest = i;
    }
  }

  return highest;
}

/** First Step only — open goals. Rising Quitter+ — tier minimums apply. */
export function enforcesStrictGoalMinimums(
  earnedBadgeIds: readonly string[],
): boolean {
  return resolveBadgeTierIndex(earnedBadgeIds) >= 1;
}

function tierMinDays(tierIndex: number): number {
  return TIER_MIN_DAYS[Math.min(tierIndex, TIER_MIN_DAYS.length - 1)];
}

function roundMoney(amount: number): number {
  if (amount <= 0) return 5;
  if (amount < 50) return Math.ceil(amount / 5) * 5;
  if (amount < 200) return Math.ceil(amount / 10) * 10;
  return Math.ceil(amount / 25) * 25;
}

function dailySavings(economics: GoalEconomics): number {
  const perPack = Math.max(1, economics.cigarettesPerPack);
  return (Math.max(0, economics.cigarettesPerDay) / perPack) * economics.packPrice;
}

function computeBeginnerMinTarget(
  type: GoalType,
  progress: GoalProgressSnapshot,
): number {
  switch (type) {
    case 'smoke_free_days':
      return Math.max(1, Math.floor(progress.smokeFreeDays) + 1);
    case 'money_saved':
      return Math.max(1, Math.floor(progress.moneySaved) + 1);
    case 'cigarettes_avoided':
      return Math.max(1, Math.floor(progress.cigarettesAvoided) + 1);
  }
}

function computeStrictMinTarget(
  type: GoalType,
  progress: GoalProgressSnapshot,
  economics: GoalEconomics,
  earnedBadgeIds: readonly string[],
  historicalBestCigarettes: number,
): number {
  const tierIndex = resolveBadgeTierIndex(earnedBadgeIds);

  switch (type) {
    case 'smoke_free_days':
      return Math.max(Math.floor(progress.smokeFreeDays) + 1, tierMinDays(tierIndex));
    case 'money_saved': {
      const savings = dailySavings(economics);
      const raw = Math.max(
        progress.moneySaved + 5,
        savings > 0 ? savings * tierMinDays(tierIndex) : tierMinDays(tierIndex) * 5,
      );
      return roundMoney(raw);
    }
    case 'cigarettes_avoided': {
      const cpd = Math.max(0, economics.cigarettesPerDay);
      const tierFloor = Math.max(cpd * tierMinDays(tierIndex), 20);
      const veteranFloor =
        tierIndex >= 5
          ? Math.max(Math.floor(historicalBestCigarettes * 0.25), tierFloor)
          : tierFloor;
      return Math.max(Math.floor(progress.cigarettesAvoided) + 10, veteranFloor);
    }
  }
}

export function computeMinTarget(
  type: GoalType,
  progress: GoalProgressSnapshot,
  economics: GoalEconomics,
  earnedBadgeIds: readonly string[],
  historicalBestCigarettes: number,
): number {
  if (!enforcesStrictGoalMinimums(earnedBadgeIds)) {
    return computeBeginnerMinTarget(type, progress);
  }

  return computeStrictMinTarget(
    type,
    progress,
    economics,
    earnedBadgeIds,
    historicalBestCigarettes,
  );
}

export function computeAllMinTargets(
  progress: GoalProgressSnapshot,
  economics: GoalEconomics,
  earnedBadgeIds: readonly string[],
  historicalBestCigarettes: number,
): Record<GoalType, number> {
  return {
    money_saved: computeMinTarget(
      'money_saved',
      progress,
      economics,
      earnedBadgeIds,
      historicalBestCigarettes,
    ),
    smoke_free_days: computeMinTarget(
      'smoke_free_days',
      progress,
      economics,
      earnedBadgeIds,
      historicalBestCigarettes,
    ),
    cigarettes_avoided: computeMinTarget(
      'cigarettes_avoided',
      progress,
      economics,
      earnedBadgeIds,
      historicalBestCigarettes,
    ),
  };
}

export function isAllowedTarget(
  type: GoalType,
  target: number,
  progress: GoalProgressSnapshot,
  economics: GoalEconomics,
  earnedBadgeIds: readonly string[],
  historicalBestCigarettes: number,
): boolean {
  if (!Number.isFinite(target) || target <= 0) return false;

  const minTarget = computeMinTarget(
    type,
    progress,
    economics,
    earnedBadgeIds,
    historicalBestCigarettes,
  );

  if (type === 'money_saved') {
    return target >= minTarget;
  }

  return Number.isInteger(target) && target >= minTarget;
}
