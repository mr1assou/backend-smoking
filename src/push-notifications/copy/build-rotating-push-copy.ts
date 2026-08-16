import { pickMotivationBody } from '../content/motivations';
import { formatMoneySavedForPush } from '../content/money';
import {
  buildStreakPushCopy,
  formatStreakDurationForPush,
} from '../content/streak';
import { pickTipBody } from '../content/tips';
import type { PushRecipient } from '../push-notifications.repository';
import type { PushKind } from '../rotation/push-rotation';
import type { PushCopy } from './push-copy.types';

function firstName(username: string | null): string {
  return username?.trim().split(/\s+/)[0] || 'Friend';
}

function pluralize(count: number, singular: string): string {
  return count === 1 ? singular : `${singular}s`;
}

export function buildRotatingPushCopy(input: {
  recipient: PushRecipient;
  kind: PushKind;
  streakDays: number;
  streakDaysInProgress: number;
  elapsedMs: number;
  contentSlot: number;
  moneySaved?: number;
}): PushCopy {
  const name = firstName(input.recipient.username);
  const duration = formatStreakDurationForPush(input.elapsedMs);
  const days = input.streakDaysInProgress;

  switch (input.kind) {
    case 'streak': {
      const copy = buildStreakPushCopy({
        username: input.recipient.username,
        streakDays: input.streakDays,
        streakDaysInProgress: input.streakDaysInProgress,
        elapsedMs: input.elapsedMs,
      });
      return {
        kind: 'streak',
        title: `🏆 ${copy.title}`,
        body: copy.body,
      };
    }

    case 'tip': {
      const tip = pickTipBody({
        userId: input.recipient.userId,
        rotationSlot: input.contentSlot,
        tipsCardIndex: input.recipient.tipsCardIndex,
      });
      return {
        kind: 'tip',
        title: '💡 Quick tip for you',
        body: `${name}, ${tip}`,
      };
    }

    case 'money': {
      const saved = input.moneySaved ?? 0;
      const formatted = formatMoneySavedForPush(
        saved,
        input.recipient.currency,
      );

      if (days <= 0 || saved <= 0) {
        return {
          kind: 'money',
          title: '💰 Your savings are growing',
          body: `${name}, every smoke-free hour puts money back in your pocket.`,
        };
      }

      return {
        kind: 'money',
        title: '💰 Money saved',
        body: `${formatted} saved so far (${duration} smoke-free). That is real money back, ${name}.`,
      };
    }

    case 'motivation': {
      const line = pickMotivationBody({
        userId: input.recipient.userId,
        rotationSlot: input.contentSlot,
        motivationCardIndex: input.recipient.motivationCardIndex,
      });
      const streakLine =
        days > 0 ? ` ${days} ${pluralize(days, 'day')} strong.` : '';

      return {
        kind: 'motivation',
        title: `❤️ We believe in you, ${name}`,
        body: `${line}${streakLine}`,
      };
    }
  }
}
