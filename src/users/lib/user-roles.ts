export const USER_ROLES = ['normal', 'support'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const DEFAULT_USER_ROLE: UserRole = 'normal';

export function isSupportRole(role: string | null | undefined): boolean {
  return role === 'support';
}
