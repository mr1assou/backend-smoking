import type { CallKind } from '../../call/types/call.types';

export const CALL_HISTORY_STATUSES = [
  'completed',
  'missed',
  'declined',
] as const;

export type CallHistoryStatus = (typeof CALL_HISTORY_STATUSES)[number];

export type CallHistoryPayload = {
  v: 1;
  callKind: CallKind;
  status: CallHistoryStatus;
  durationMs?: number;
};

export function encodeCallHistoryPayload(payload: CallHistoryPayload): string {
  return JSON.stringify(payload);
}

export function parseCallHistoryPayload(
  raw: string | null | undefined,
): CallHistoryPayload | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CallHistoryPayload>;
    if (parsed.v !== 1) return null;
    if (parsed.callKind !== 'audio' && parsed.callKind !== 'video') return null;
    if (
      parsed.status !== 'completed' &&
      parsed.status !== 'missed' &&
      parsed.status !== 'declined'
    ) {
      return null;
    }
    return {
      v: 1,
      callKind: parsed.callKind,
      status: parsed.status,
      durationMs:
        typeof parsed.durationMs === 'number' && parsed.durationMs >= 0
          ? parsed.durationMs
          : undefined,
    };
  } catch {
    return null;
  }
}
