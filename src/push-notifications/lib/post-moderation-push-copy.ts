import type { PushLocale } from './push-locale';

const COPY: Record<PushLocale, { title: string; body: string }> = {
  en: {
    title: 'Post removed',
    body: 'Your post was removed because it is not related to quitting smoking and is not allowed in the community.',
  },
  fr: {
    title: 'Publication supprimée',
    body: "Votre publication a été supprimée car elle n'est pas liée à l'arrêt du tabac et n'est pas autorisée dans la communauté.",
  },
};

export function buildPostModerationPushCopy(locale: PushLocale): {
  title: string;
  body: string;
} {
  return COPY[locale];
}
