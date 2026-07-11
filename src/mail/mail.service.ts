import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly fromAddress: string;

  constructor(private readonly config: ConfigService) {
    const apiKey =
      this.config.get<string>('RESEND_API_KEY') ??
      this.config.get<string>('REND_API_KEY');
    this.resend = apiKey ? new Resend(apiKey) : null;

    const fromEmail =
      this.config.get<string>('EMAIL_FROM') ?? 'noreply@quitify.support';
    const fromName = this.config.get<string>('EMAIL_FROM_NAME') ?? 'Quitify';
    this.fromAddress = `${fromName} <${fromEmail}>`;
  }

  async sendOtpEmail(to: string, code: string): Promise<void> {
    if (!this.resend) {
      this.logger.warn(
        `RESEND_API_KEY missing — OTP for ${to}: ${code} (dev only)`,
      );
      return;
    }

    const { error } = await this.resend.emails.send({
      from: this.fromAddress,
      to,
      subject: 'Your Quitify verification code',
      text: `Your Quitify verification code is ${code}. It expires in 10 minutes.\n\nIf you did not request this, you can ignore this email.`,
      html: `<p>Your Quitify verification code is <strong>${code}</strong>.</p><p>It expires in 10 minutes.</p><p>If you did not request this, you can ignore this email.</p>`,
    });

    if (error) {
      this.logger.error(`Failed to send OTP email to ${to}`, error);
      throw new InternalServerErrorException('Could not send verification email');
    }
  }
}
