import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

export type VerifiedGoogleUser = {
  email: string;
  name?: string;
};

@Injectable()
export class GoogleTokenService {
  private readonly client = new OAuth2Client();

  constructor(private config: ConfigService) {}

  async verifyIdToken(idToken: string): Promise<VerifiedGoogleUser> {
    const clientId = this.getWebClientId();
    if (!clientId) {
      throw new InternalServerErrorException('Google OAuth is not configured');
    }

    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: clientId,
      });
      const payload = ticket.getPayload();

      if (!payload?.email) {
        throw new UnauthorizedException('Google account has no email');
      }
      if (payload.email_verified === false) {
        throw new UnauthorizedException('Google email is not verified');
      }

      return { email: payload.email, name: payload.name };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid Google ID token');
    }
  }

  getWebClientId(): string | undefined {
    return (
      this.config.get<string>('client_id')?.trim() ||
      this.config.get<string>('GOOGLE_CLIENT_ID')?.trim()
    );
  }
}
