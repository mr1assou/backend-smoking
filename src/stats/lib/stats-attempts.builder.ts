import { QuitAttempt } from '@prisma/client';
import { AttemptsRepository } from '../../attempts/attempts.repository';
import { AttemptsService } from '../../attempts/attempts.service';
import { toUtcIso } from '../../common/utc-instant';
import type { AttemptStatsRow } from '../types';
import type { AttemptImpactSnapshot } from './attempt-impact';

export async function buildAttemptsList(
  userId: number,
  activeTimelineStart: Date | null,
  active: QuitAttempt | null,
  activeSnapshot: AttemptImpactSnapshot | null,
  now: Date,
  attemptsRepository: AttemptsRepository,
  attemptsService: AttemptsService,
): Promise<AttemptStatsRow[]> {
  const rows = await attemptsRepository.listAllForUser(userId);

  return Promise.all(
    rows.map(async (row) => {
      const isActive = row.endedAt === null;

      if (
        isActive &&
        active &&
        row.attempt_id === active.attempt_id &&
        activeSnapshot
      ) {
        return {
          attemptNumber: row.attemptNumber,
          startedAt: toUtcIso(row.startedAt),
          endedAt: null,
          endOutcome: null,
          isActive: true,
          ...activeSnapshot,
        };
      }

      if (isActive) {
        const timelineStart = activeTimelineStart ?? row.startedAt;
        const snapshot = await attemptsService.computeSegmentedSnapshot(
          userId,
          row,
          timelineStart,
          now,
        );
        return {
          attemptNumber: row.attemptNumber,
          startedAt: toUtcIso(row.startedAt),
          endedAt: null,
          endOutcome: null,
          isActive: true,
          ...snapshot,
        };
      }

      return {
        attemptNumber: row.attemptNumber,
        startedAt: toUtcIso(row.startedAt),
        endedAt: row.endedAt ? toUtcIso(row.endedAt) : null,
        endOutcome: row.endOutcome,
        isActive: false,
        durationSeconds: row.durationSeconds,
        cigarettesAvoided: row.cigarettesAvoided,
        moneySaved: row.moneySaved,
        lifeMinutesGained: row.lifeMinutesGained,
        slipCigarettesSmoked: row.slipCigarettesSmoked,
      };
    }),
  );
}
