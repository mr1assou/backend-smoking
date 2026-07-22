import { NotFoundException } from '@nestjs/common';
import { QuitAttempt } from '@prisma/client';
import { AttemptsRepository } from '../../attempts/attempts.repository';
import { AttemptsService } from '../../attempts/attempts.service';
import { utcInstantNow } from '../../common/utc-instant';
import { UsersRepository } from '../../users/users.repository';
import type { AttemptImpactSnapshot } from './attempt-impact';

export type StatsUserContext = {
  currency: string;
  economics: ReturnType<AttemptsService['buildEconomics']>;
  now: Date;
  active: QuitAttempt | null;
  activeSnapshot: AttemptImpactSnapshot | null;
  activeTimelineStart: Date | null;
};

export async function loadStatsUserContext(
  userId: number,
  usersRepository: UsersRepository,
  attemptsRepository: AttemptsRepository,
  attemptsService: AttemptsService,
): Promise<StatsUserContext> {
  const user = await usersRepository.findById(userId);
  if (!user) throw new NotFoundException('User not found');

  const economics = attemptsService.buildEconomics(user);
  const now = utcInstantNow();
  const active = await attemptsRepository.findActive(userId);

  let activeSnapshot: AttemptImpactSnapshot | null = null;
  const activeTimelineStart =
    user.streakStart ?? user.quitDate ?? active?.startedAt ?? null;

  if (active && activeTimelineStart) {
    const snapshot = await attemptsService.computeSegmentedSnapshot(
      userId,
      active,
      activeTimelineStart,
      now,
      undefined,
      // Active attempt has not closed yet — no slip cigarettes belong to it.
      { pendingSlipOnly: true },
    );
    activeSnapshot = {
      ...snapshot,
      slipCigarettesSmoked: 0,
    };
  }

  return {
    currency: user.currency ?? 'USD',
    economics,
    now,
    active,
    activeSnapshot,
    activeTimelineStart,
  };
}
