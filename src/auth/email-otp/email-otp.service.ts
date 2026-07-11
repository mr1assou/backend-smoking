import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes, randomInt } from 'crypto';
import * as argon2 from 'argon2';

import { MailService } from '../../mail/mail.service';
import { RedisService } from '../../redis/redis.service';
import { UsersService } from '../../users/users.service';
import { AuthService } from '../auth.service';
import {
  EMAIL_OTP_LENGTH,
  EMAIL_OTP_RESEND_COOLDOWN_SECONDS,
  EMAIL_OTP_TTL_SECONDS,
  PLAY_REVIEWER_EMAIL,
  PLAY_REVIEWER_OTP,
} from './email-otp.constants';
import {
  emailLoginOtpCooldownKey,
  emailLoginOtpKey,
  emailSignupOtpCooldownKey,
  emailSignupOtpKey,
} from './email-otp.redis-keys';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function generateOtpCode(): string {
  const max = 10 ** EMAIL_OTP_LENGTH;
  const min = 10 ** (EMAIL_OTP_LENGTH - 1);
  return String(randomInt(min, max));
}

function isPlayReviewerEmail(email: string): boolean {
  return email === PLAY_REVIEWER_EMAIL;
}

@Injectable()
export class EmailOtpService {
  constructor(
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly redis: RedisService,
    private readonly authService: AuthService,
  ) {}

  async sendSignupOtp(rawEmail: string): Promise<void> {
    const email = normalizeEmail(rawEmail);
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException(
        'An account already exists for this email. Sign in instead.',
      );
    }

    const client = this.redis.getClient();
    const cooldownKey = emailSignupOtpCooldownKey(email);
    const onCooldown = await client.get(cooldownKey);
    if (onCooldown) {
      throw new HttpException(
        'Please wait a minute before requesting another code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = generateOtpCode();
    const hashed = await argon2.hash(code);

    await client
      .multi()
      .set(emailSignupOtpKey(email), hashed, 'EX', EMAIL_OTP_TTL_SECONDS)
      .set(cooldownKey, '1', 'EX', EMAIL_OTP_RESEND_COOLDOWN_SECONDS)
      .exec();

    await this.mailService.sendOtpEmail(email, code);
  }

  async verifySignupOtp(rawEmail: string, code: string) {
    const email = normalizeEmail(rawEmail);
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException(
        'An account already exists for this email. Sign in instead.',
      );
    }

    const storedHash = await this.redis
      .getClient()
      .get(emailSignupOtpKey(email));
    if (!storedHash) {
      throw new ForbiddenException('Code expired or not found. Request a new one.');
    }

    const matches = await argon2.verify(storedHash, code.trim());
    if (!matches) {
      throw new ForbiddenException('Invalid verification code.');
    }

    await this.redis.getClient().del(emailSignupOtpKey(email));

    const password = await argon2.hash(randomBytes(32).toString('hex'));
    const user = await this.usersService.createWithHashedPassword(email, password);
    const tokens = await this.authService.issueTokensForUser(
      user.user_id,
      user.email,
    );

    return { ...tokens, isNewUser: true, email: user.email };
  }

  async sendLoginOtp(rawEmail: string): Promise<void> {
    const email = normalizeEmail(rawEmail);
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('No account found for this email');
    }

    if (isPlayReviewerEmail(email)) {
      return;
    }

    const client = this.redis.getClient();
    const cooldownKey = emailLoginOtpCooldownKey(email);
    const onCooldown = await client.get(cooldownKey);
    if (onCooldown) {
      throw new HttpException(
        'Please wait a minute before requesting another code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = generateOtpCode();
    const hashed = await argon2.hash(code);

    await client
      .multi()
      .set(emailLoginOtpKey(email), hashed, 'EX', EMAIL_OTP_TTL_SECONDS)
      .set(cooldownKey, '1', 'EX', EMAIL_OTP_RESEND_COOLDOWN_SECONDS)
      .exec();

    await this.mailService.sendOtpEmail(email, code);
  }

  async verifyLoginOtp(rawEmail: string, code: string) {
    const email = normalizeEmail(rawEmail);
    const trimmedCode = code.trim();
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('No account found for this email');
    }

    if (isPlayReviewerEmail(email)) {
      if (trimmedCode !== PLAY_REVIEWER_OTP) {
        throw new ForbiddenException('Invalid verification code.');
      }
    } else {
      const storedHash = await this.redis
        .getClient()
        .get(emailLoginOtpKey(email));
      if (!storedHash) {
        throw new ForbiddenException(
          'Code expired or not found. Request a new one.',
        );
      }

      const matches = await argon2.verify(storedHash, trimmedCode);
      if (!matches) {
        throw new ForbiddenException('Invalid verification code.');
      }

      await this.redis.getClient().del(emailLoginOtpKey(email));
    }

    const tokens = await this.authService.issueTokensForUser(
      user.user_id,
      user.email,
    );

    return { ...tokens, isNewUser: false, email: user.email };
  }
}
