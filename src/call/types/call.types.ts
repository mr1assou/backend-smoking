export const CALL_KINDS = ['audio', 'video'] as const;
export type CallKind = (typeof CALL_KINDS)[number];

/** WebRTC negotiation payload relayed verbatim between the two peers. */
export type CallSignal =
  | { type: 'offer'; sdp: string }
  | { type: 'answer'; sdp: string }
  | { type: 'candidate'; candidate: unknown }
  | { type: 'camera'; enabled: boolean };

/** Caller identity shown on the recipient's incoming-call screen. */
export type CallerInfo = {
  fromUserId: number;
  callerName: string | null;
  callerAvatarUrl: string | null;
  callerCountryFlag: string | null;
  callerBadgeId: string;
};

/** Server → client events emitted into a user's call room. */
export type CallOutboundEvent =
  | { event: 'call:incoming'; payload: IncomingCallPayload }
  | { event: 'call:accepted'; payload: CallIdPayload }
  | { event: 'call:rejected'; payload: CallIdPayload }
  | { event: 'call:canceled'; payload: CallIdPayload }
  | { event: 'call:ended'; payload: CallIdPayload }
  | { event: 'call:unavailable'; payload: CallIdPayload }
  | { event: 'call:signal'; payload: CallSignalPayload };

export type CallIdPayload = { callId: string };

export type IncomingCallPayload = CallerInfo & {
  callId: string;
  kind: CallKind;
};

export type CallSignalPayload = {
  callId: string;
  fromUserId: number;
  signal: CallSignal;
};

/** Envelope published to Redis so any instance can deliver to the target. */
export type CallRedisEvent = {
  targetUserId: number;
} & CallOutboundEvent;

/** Stored while an invite waits to be answered (survives app cold start). */
export type PendingCall = IncomingCallPayload;
