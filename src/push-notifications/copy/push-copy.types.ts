import type { PushKind } from '../rotation/push-rotation';

export type PushCopy = {
  title: string;
  body: string;
  kind: PushKind;
};
