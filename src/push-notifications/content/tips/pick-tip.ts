import { pickFromList } from '../../copy/pick-from-list';
import { TIP_MESSAGES } from './tips';

export function pickTipBody(input: {
  userId: number;
  rotationSlot: number;
  tipsCardIndex: number;
}): string {
  const seed = input.userId + input.rotationSlot + input.tipsCardIndex;
  return pickFromList(TIP_MESSAGES, seed);
}
