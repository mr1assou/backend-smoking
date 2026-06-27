import { pickFromList } from '../../copy/pick-from-list';
import { MOTIVATION_MESSAGES } from './messages';

export function pickMotivationBody(input: {
  userId: number;
  rotationSlot: number;
  motivationCardIndex: number;
}): string {
  const seed =
    input.userId + input.rotationSlot + input.motivationCardIndex;

  return pickFromList(MOTIVATION_MESSAGES, seed).body;
}
