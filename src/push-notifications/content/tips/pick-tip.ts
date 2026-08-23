import { pickFromList } from '../../copy/pick-from-list';
import type { PushLocale } from '../../lib/push-locale';
import { TIP_MESSAGES } from './tips';
import { TIP_MESSAGES_FR } from './tips.fr';

export function pickTipBody(input: {
  userId: number;
  rotationSlot: number;
  tipsCardIndex: number;
  locale?: PushLocale;
}): string {
  const seed = input.userId + input.rotationSlot + input.tipsCardIndex;
  const messages = input.locale === 'fr' ? TIP_MESSAGES_FR : TIP_MESSAGES;
  return pickFromList(messages, seed);
}
