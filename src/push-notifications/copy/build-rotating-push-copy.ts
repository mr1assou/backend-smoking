import { pickMotivationBody } from '../content/motivations';
import { formatMoneySavedForPush } from '../content/money';
import {
  buildStreakPushCopy,
  formatStreakDurationForPush,
} from '../content/streak';
import { pickTipBody } from '../content/tips';
import { resolvePushLocale, type PushLocale } from '../lib/push-locale';
import type { PushRecipient } from '../push-notifications.repository';
import type { PushKind } from '../rotation/push-rotation';
import type { PushCopy } from './push-copy.types';

function firstName(username: string | null, locale: PushLocale): string {
  return (
    username?.trim().split(/\s+/)[0] || (locale === 'fr' ? 'Ami' : 'Friend')
  );
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
  const locale = resolvePushLocale(input.recipient.locale);
  const name = firstName(input.recipient.username, locale);
  const duration = formatStreakDurationForPush(input.elapsedMs, locale);
  const days = input.streakDaysInProgress;

  switch (input.kind) {
    case 'streak': {
      const copy = buildStreakPushCopy({
        username: input.recipient.username,
        streakDays: input.streakDays,
        streakDaysInProgress: input.streakDaysInProgress,
        elapsedMs: input.elapsedMs,
        locale,
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
        locale,
      });
      return {
        kind: 'tip',
        title:
          locale === 'fr'
            ? '💡 Petit conseil pour vous'
            : '💡 Quick tip for you',
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
          title:
            locale === 'fr'
              ? '💰 Vos économies grandissent'
              : '💰 Your savings are growing',
          body:
            locale === 'fr'
              ? `${name}, chaque heure sans fumer remet de l'argent dans votre poche.`
              : `${name}, every smoke-free hour puts money back in your pocket.`,
        };
      }

      return {
        kind: 'money',
        title: locale === 'fr' ? '💰 Argent économisé' : '💰 Money saved',
        body:
          locale === 'fr'
            ? `${formatted} économisés (${duration} sans fumer). C'est de l'argent bien réel, ${name}.`
            : `${formatted} saved so far (${duration} smoke-free). That is real money back, ${name}.`,
      };
    }

    case 'motivation': {
      const line = pickMotivationBody({
        userId: input.recipient.userId,
        rotationSlot: input.contentSlot,
        motivationCardIndex: input.recipient.motivationCardIndex,
        locale,
      });
      const streakLine =
        days > 0
          ? locale === 'fr'
            ? ` ${days} ${pluralize(days, 'jour')} de force.`
            : ` ${days} ${pluralize(days, 'day')} strong.`
          : '';

      return {
        kind: 'motivation',
        title:
          locale === 'fr'
            ? `❤️ On croit en vous, ${name}`
            : `❤️ We believe in you, ${name}`,
        body: `${line}${streakLine}`,
      };
    }
  }
}
