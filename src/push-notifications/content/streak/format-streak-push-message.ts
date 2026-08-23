import { MS_PER_SMOKE_FREE_DAY } from '../../../common/smoke-free-days';
import type { PushLocale } from '../../lib/push-locale';

function pad2(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(2, '0');
}

function pluralize(count: number, singular: string): string {
  return count === 1 ? singular : `${singular}s`;
}

const DURATION_WORDS: Record<
  PushLocale,
  { day: string; hour: string; minute: string; zero: string }
> = {
  en: { day: 'day', hour: 'hour', minute: 'minute', zero: '0 minutes' },
  fr: { day: 'jour', hour: 'heure', minute: 'minute', zero: '0 minute' },
};

export function formatStreakDurationForPush(
  elapsedMs: number,
  locale: PushLocale = 'en',
): string {
  const words = DURATION_WORDS[locale];
  if (elapsedMs <= 0) return words.zero;

  const totalMinutes = Math.floor(elapsedMs / 60_000);
  const days = Math.floor(elapsedMs / MS_PER_SMOKE_FREE_DAY);
  const hours = Math.floor((elapsedMs % MS_PER_SMOKE_FREE_DAY) / 3_600_000);
  const minutes = Math.floor((elapsedMs % 3_600_000) / 60_000);

  if (days > 0) {
    const dayPart = `${days} ${pluralize(days, words.day)}`;
    if (hours > 0) return `${dayPart} ${hours}h`;
    return dayPart;
  }

  if (hours > 0) {
    return minutes > 0
      ? `${hours}h ${pad2(minutes)}min`
      : `${hours} ${pluralize(hours, words.hour)}`;
  }

  const shownMinutes = Math.max(totalMinutes, 1);
  return `${shownMinutes} ${pluralize(shownMinutes, words.minute)}`;
}

export type StreakPushCopy = {
  title: string;
  body: string;
};

export function buildStreakPushCopy(input: {
  username: string | null;
  streakDays: number;
  streakDaysInProgress: number;
  elapsedMs: number;
  locale?: PushLocale;
}): StreakPushCopy {
  const locale = input.locale ?? 'en';
  const firstName = input.username?.trim().split(/\s+/)[0] || defaultName(locale);
  const duration = formatStreakDurationForPush(input.elapsedMs, locale);
  const days = input.streakDaysInProgress;

  if (locale === 'fr') {
    return buildStreakPushCopyFr({
      firstName,
      duration,
      days,
      streakDays: input.streakDays,
    });
  }

  if (days <= 0) {
    return {
      title: 'Your smoke-free story starts here',
      body: `Hey ${firstName}, open Quitify and take the next step on your journey.`,
    };
  }

  if (days === 1) {
    return {
      title: 'Day 1 — You showed up',
      body: `${duration} smoke-free. ${firstName}, that first day is everything.`,
    };
  }

  if (days === 7) {
    return {
      title: 'One week smoke-free',
      body: `${duration} strong. ${firstName}, your body is already thanking you.`,
    };
  }

  if (days === 30) {
    return {
      title: '30 days — A real milestone',
      body: `${duration} without smoking. ${firstName}, you are building a new life.`,
    };
  }

  if (input.streakDays >= 1 && days % 7 === 0) {
    const weeks = days / 7;
    return {
      title: `${weeks} ${pluralize(weeks, 'week')} smoke-free`,
      body: `${duration} and counting. Keep going, ${firstName}.`,
    };
  }

  return {
    title: `${days} ${pluralize(days, 'day')} smoke-free`,
    body: `${duration} strong. ${firstName}, Quitify is cheering for you.`,
  };
}

function defaultName(locale: PushLocale): string {
  return locale === 'fr' ? 'Ami' : 'Friend';
}

function buildStreakPushCopyFr(input: {
  firstName: string;
  duration: string;
  days: number;
  streakDays: number;
}): StreakPushCopy {
  const { firstName, duration, days } = input;

  if (days <= 0) {
    return {
      title: 'Votre histoire sans tabac commence ici',
      body: `${firstName}, ouvrez Quitify et faites le prochain pas de votre parcours.`,
    };
  }

  if (days === 1) {
    return {
      title: 'Jour 1 — Vous avez tenu bon',
      body: `${duration} sans fumer. ${firstName}, ce premier jour est le plus important.`,
    };
  }

  if (days === 7) {
    return {
      title: 'Une semaine sans tabac',
      body: `${duration} déjà. ${firstName}, votre corps vous remercie.`,
    };
  }

  if (days === 30) {
    return {
      title: '30 jours — Un vrai cap',
      body: `${duration} sans fumer. ${firstName}, vous construisez une nouvelle vie.`,
    };
  }

  if (input.streakDays >= 1 && days % 7 === 0) {
    const weeks = days / 7;
    return {
      title: `${weeks} ${pluralize(weeks, 'semaine')} sans tabac`,
      body: `${duration} et ça continue. Continuez, ${firstName}.`,
    };
  }

  return {
    title: `${days} ${pluralize(days, 'jour')} sans tabac`,
    body: `${duration} déjà. ${firstName}, Quitify vous encourage.`,
  };
}
