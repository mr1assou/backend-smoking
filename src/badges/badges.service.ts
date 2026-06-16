import { Injectable, NotFoundException } from '@nestjs/common';
import { smokeFreeDaysFromInstant } from '../common/smoke-free-days';
import { utcInstantNow } from '../common/utc-instant';
import { BadgesRepository } from './badges.repository';
import { findNextPendingBadgeGrant } from './lib/evaluate-pending-badges';

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

    const smokeFreeDays = smokeFreeDaysFromInstant(
      context.streakStart,
      context.quitDate,
      utcInstantNow(),
    );

    const nextBadgeId = findNextPendingBadgeGrant(
      earnedSet,
      smokeFreeDays,
      context.freedomPoints,
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
