import { Injectable, NotFoundException } from '@nestjs/common';
import { smokeFreeDaysFromInstant } from '../common/smoke-free-days';
import { utcInstantNow } from '../common/utc-instant';
import { BadgesRepository } from './badges.repository';
import { findNextPendingBadgeGrant } from './lib/evaluate-pending-badges';
import { highestEarnedBadgeId } from './lib/highest-earned-badge';

export type SyncEarnedBadgesResult = {
  newBadges: string[];
  earnedBadgeIds: string[];
};

@Injectable()
export class BadgesService {
  constructor(private readonly badgesRepository: BadgesRepository) {}

  grantSignupBadge(userId: number): Promise<void> {
    return this.badgesRepository.grantSignupBadge(userId);
  }

  findEarnedBadgeIds(userId: number): Promise<string[]> {
    return this.badgesRepository.findEarnedBadgeIds(userId);
  }

  async resolveHighestBadgeIdsByUserIds(
    userIds: number[],
  ): Promise<Map<number, string>> {
    const uniqueIds = [...new Set(userIds)];
    if (uniqueIds.length === 0) return new Map();

    const badgesByUser =
      await this.badgesRepository.findEarnedBadgeIdsByUserIds(uniqueIds);
    const result = new Map<number, string>();

    for (const userId of uniqueIds) {
      result.set(userId, highestEarnedBadgeId(badgesByUser.get(userId) ?? []));
    }

    return result;
  }

  countCompletedGoals(userId: number): Promise<number> {
    return this.badgesRepository.countCompletedGoals(userId);
  }

  /**
   * Grants the next sequential badge when its requirements are met.
   * Safe to call on every session load (after FP sync).
   */
  async syncEarnedBadges(userId: number): Promise<SyncEarnedBadgesResult> {
    const context = await this.badgesRepository.findUserBadgeContext(userId);
    if (!context) throw new NotFoundException('User not found');

    const earnedBadgeIds =
      await this.badgesRepository.findEarnedBadgeIds(userId);
    const earnedSet = new Set(earnedBadgeIds);
    const hasCommittedToQuit = Boolean(context.quitDate);
    const goalsCompleted =
      await this.badgesRepository.countCompletedGoals(userId);

    const smokeFreeDays = smokeFreeDaysFromInstant(
      context.streakStart,
      context.quitDate,
      utcInstantNow(),
    );

    const nextBadgeId = findNextPendingBadgeGrant(
      earnedSet,
      smokeFreeDays,
      context.freedomPoints,
      goalsCompleted,
      hasCommittedToQuit,
    );

    const newBadges: string[] = [];
    if (nextBadgeId) {
      await this.badgesRepository.grantBadge(userId, nextBadgeId);
      earnedSet.add(nextBadgeId);
      newBadges.push(nextBadgeId);
    }

    return {
      newBadges,
      earnedBadgeIds: [...earnedSet],
    };
  }
}
