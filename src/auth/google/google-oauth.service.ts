import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { AuthService } from '../auth.service';

type OAuthStatePayload = {
  returnUrl: string;
};

@Injectable()
export class GoogleOAuthService {
  constructor(
    private config: ConfigService,
    private jwt: JwtService,
    private authService: AuthService,
  ) {}

  createAuthorizationUrl(returnUrl: string): string {
    if (!this.isAllowedReturnUrl(returnUrl)) {
      throw new BadRequestException('Invalid return URL');
    }

    const client = this.getOAuthClient();
    const state = this.jwt.sign(
      { returnUrl } satisfies OAuthStatePayload,
      {
        secret: this.config.get<string>('JWT_SECRET'),
        expiresIn: '10m',
      },
    );

    return client.generateAuthUrl({
      access_type: 'online',
      scope: ['openid', 'email', 'profile'],
      state,
      prompt: 'select_account',
    });
  }

  async handleCallback(code: string, state: string): Promise<string> {
    if (!code?.trim() || !state?.trim()) {
      throw new BadRequestException('Missing OAuth parameters');
    }

    let returnUrl: string;
    try {
      const payload = await this.jwt.verifyAsync<OAuthStatePayload>(state, {
        secret: this.config.get<string>('JWT_SECRET'),
      });
      returnUrl = payload.returnUrl;
    } catch {
      throw new BadRequestException('Invalid or expired OAuth state');
    }

    if (!this.isAllowedReturnUrl(returnUrl)) {
      throw new BadRequestException('Invalid return URL');
    }

    try {
      const client = this.getOAuthClient();
      const { tokens } = await client.getToken(code);
      const idToken = tokens.id_token;
      if (!idToken) {
        throw new InternalServerErrorException('Google did not return an ID token');
      }

      const auth = await this.authService.googleSignIn(idToken);
      return this.appendQueryParams(returnUrl, {
        accessToken: auth.accessToken,
        refreshToken: auth.refreshToken,
        email: auth.email,
        isNewUser: auth.isNewUser ? '1' : '0',
      });
    } catch (error) {
      const raw =
        error instanceof Error ? error.message : 'Google sign-in failed';
      const message = raw.split('\n').at(0)?.trim().slice(0, 150) ?? raw;
      return this.appendQueryParams(returnUrl, { error: message });
    }
  }

  private getOAuthClient(): OAuth2Client {
    const clientId = this.config.get<string>('client_id')?.trim();
    const clientSecret = this.config.get<string>('client_secret')?.trim();
    const redirectUri = this.getRedirectUri();

    if (!clientId || !clientSecret || !redirectUri) {
      throw new InternalServerErrorException('Google OAuth is not configured');
    }

    return new OAuth2Client(clientId, clientSecret, redirectUri);
  }

  private getRedirectUri(): string {
    const configured = this.config.get<string>('GOOGLE_REDIRECT_URI')?.trim();
    if (configured) return configured;

    const base = this.config.get<string>('API_PUBLIC_URL')?.trim();
    if (base) {
      return `${base.replace(/\/$/, '')}/auth/google/callback`;
    }

    throw new InternalServerErrorException(
      'Set GOOGLE_REDIRECT_URI or API_PUBLIC_URL in .env',
    );
  }

  private isAllowedReturnUrl(url: string): boolean {
    return (
      url.startsWith('exp://') ||
      url.startsWith('quitsmoking://') ||
      url.startsWith('http://localhost') ||
      url.startsWith('http://127.0.0.1') ||
      url.startsWith('http://192.168.')
    );
  }

  private appendQueryParams(
    base: string,
    params: Record<string, string>,
  ): string {
    const separator = base.includes('?') ? '&' : '?';
    return `${base}${separator}${new URLSearchParams(params).toString()}`;
  }
}
