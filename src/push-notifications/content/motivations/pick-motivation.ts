import { pickFromList } from '../../copy/pick-from-list';
import type { PushLocale } from '../../lib/push-locale';
import { MOTIVATION_MESSAGES } from './messages';
import { MOTIVATION_MESSAGES_FR } from './messages/fr';

export function pickMotivationBody(input: {
  userId: number;
  rotationSlot: number;
  motivationCardIndex: number;
  locale?: PushLocale;
}): string {
  const seed = input.userId + input.rotationSlot + input.motivationCardIndex;
  const messages =
    input.locale === 'fr' ? MOTIVATION_MESSAGES_FR : MOTIVATION_MESSAGES;

  return pickFromList(messages, seed).body;
}
