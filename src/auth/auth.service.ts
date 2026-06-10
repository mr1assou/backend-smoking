import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import {
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN,
} from './auth.constants';
import { GoogleTokenService } from './google/google-token.service';

export type GoogleAuthResult = {
  accessToken: string;
  refreshToken: string;
  isNewUser: boolean;
  email: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly googleToken: GoogleTokenService,
  ) {}

  async signup(dto: SignupDto) {
    const hashedPassword = await argon2.hash(dto.password);
    const user = await this.usersService.createWithHashedPassword(
      dto.email,
      hashedPassword,
    );
    return this.issueTokensForUser(user.user_id, user.email);
  }

  /**
   * Google = sign up or login: find by email → login; else create account → sign up.
   */
  async googleSignIn(idToken: string): Promise<GoogleAuthResult> {
    const googleUser = await this.googleToken.verifyIdToken(idToken);
    const email = googleUser.email.trim().toLowerCase();

    const password = await argon2.hash(randomBytes(32).toString('hex'));
    const { user, isNewUser } = await this.usersService.findOrCreateByEmail(
      email,
      password,
    );
    const tokens = await this.issueTokensForUser(user.user_id, user.email);
    return { ...tokens, isNewUser, email: user.email };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) throw new NotFoundException('User not found');

    const passwordMatches = await argon2.verify(user.password, dto.password);
    if (!passwordMatches) throw new ForbiddenException('Invalid credentials');

    return this.issueTokensForUser(user.user_id, user.email);
  }

  async refresh(userId: number, refreshToken: string) {
    const user = await this.usersService.findById(userId);

    if (!user || !user.hashedRefreshToken)
      throw new ForbiddenException('Access denied');

    const tokenMatches = await argon2.verify(
      user.hashedRefreshToken,
      refreshToken,
    );
    if (!tokenMatches) throw new ForbiddenException('Access denied');

    return this.issueTokensForUser(user.user_id, user.email);
  }

  async logout(userId: number) {
    await this.usersService.setRefreshTokenHash(userId, null);
  }

  private async issueTokensForUser(userId: number, email: string) {
    const tokens = await this.generateTokens(userId, email);
    await this.saveRefreshToken(userId, tokens.refreshToken);
    return tokens;
  }

  private async generateTokens(userId: number, email: string) {
    const payload = { sub: userId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('JWT_SECRET'),
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: REFRESH_TOKEN_EXPIRES_IN,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: number, refreshToken: string) {
    const hashed = await argon2.hash(refreshToken);
    await this.usersService.setRefreshTokenHash(userId, hashed);
  }
}
