import { MS_PER_SMOKE_FREE_DAY } from '../../../common/smoke-free-days';

function pad2(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(2, '0');
}

function pluralize(count: number, singular: string): string {
  return count === 1 ? singular : `${singular}s`;
}

export function formatStreakDurationForPush(elapsedMs: number): string {
  if (elapsedMs <= 0) return '0 minutes';

  const totalMinutes = Math.floor(elapsedMs / 60_000);
  const days = Math.floor(elapsedMs / MS_PER_SMOKE_FREE_DAY);
  const hours = Math.floor((elapsedMs % MS_PER_SMOKE_FREE_DAY) / 3_600_000);
  const minutes = Math.floor((elapsedMs % 3_600_000) / 60_000);

  if (days > 0) {
    const dayPart = `${days} ${pluralize(days, 'day')}`;
    if (hours > 0) return `${dayPart} ${hours}h`;
    return dayPart;
  }

  if (hours > 0) {
    return minutes > 0
      ? `${hours}h ${pad2(minutes)}min`
      : `${hours} ${pluralize(hours, 'hour')}`;
  }

  return `${Math.max(totalMinutes, 1)} ${pluralize(Math.max(totalMinutes, 1), 'minute')}`;
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
}): StreakPushCopy {
  const firstName = input.username?.trim().split(/\s+/)[0] || 'Friend';
  const duration = formatStreakDurationForPush(input.elapsedMs);
  const days = input.streakDaysInProgress;

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
