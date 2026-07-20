/**
 * How long a presence key may live without a refresh.
 * Heartbeats (and reconnects) renew it; after a crash/missed disconnect the
 * keys expire so chat pushes are not suppressed forever.
 */
export const PRESENCE_TTL_SECONDS = 90;
