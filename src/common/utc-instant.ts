/** Current UTC instant — same basis as `quitDate` when preset is `Now`. */
export function utcInstantNow(): Date {
  return new Date();
}

export function toUtcIso(date: Date): string {
  return date.toISOString();
}
