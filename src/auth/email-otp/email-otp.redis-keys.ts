export function emailSignupOtpKey(email: string): string {
  return `email-otp:signup:${email}`;
}

export function emailSignupOtpCooldownKey(email: string): string {
  return `email-otp:signup:cooldown:${email}`;
}

export function emailLoginOtpKey(email: string): string {
  return `email-otp:login:${email}`;
}

export function emailLoginOtpCooldownKey(email: string): string {
  return `email-otp:login:cooldown:${email}`;
}
