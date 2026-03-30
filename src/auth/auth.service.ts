import {
    ForbiddenException,
    HttpException,
    Injectable,
    ServiceUnavailableException,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import * as argon2 from 'argon2';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwt: JwtService,
        private config: ConfigService,
    ) { }

    async signup(dto: SignupDto) {
        const hashedPassword = await argon2.hash(dto.password);

        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                password: hashedPassword,
                name: dto.name
            },
        });

        const tokens = await this.generateTokens(user.id, user.email, user.role, user.name);
        await this.saveRefreshToken(user.id, tokens.refreshToken);
        return tokens;
    }

    async login(dto: LoginDto) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { email: dto.email },
            });

            const unauthorized = () =>
                new UnauthorizedException('Identifiants incorrects.');

            if (!user) throw unauthorized();

            const passwordMatches = await argon2.verify(user.password, dto.password);
            if (!passwordMatches) throw unauthorized();

            const tokens = await this.generateTokens(user.id, user.email, user.role, user.name);
            await this.saveRefreshToken(user.id, tokens.refreshToken);
            return tokens;
        } catch (error: unknown) {
            if (error instanceof HttpException) {
                throw error;
            }
            const prisma = error as { code?: string; message?: string };
            if (prisma.code === 'P1001') {
                throw new ServiceUnavailableException(
                    'La base de données est injoignable. Le serveur redémarre peut-être.',
                );
            }
            console.error(
                'Erreur Login:',
                prisma.code ?? 'non-Prisma',
                prisma.message ?? (error instanceof Error ? error.message : error),
            );
            throw error;
        }
    }

    async refresh(userId: string, refreshToken: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user || !user.hashedRefreshToken)
            throw new ForbiddenException('Access denied');

        const tokenMatches = await argon2.verify(
            user.hashedRefreshToken,
            refreshToken,
        );
        if (!tokenMatches) throw new ForbiddenException('Access denied');

        const tokens = await this.generateTokens(user.id, user.email, user.role, user.name);
        await this.saveRefreshToken(user.id, tokens.refreshToken);
        return tokens;
    }

    async logout(userId: string) {
        await this.prisma.user.update({
            where: { id: userId },
            data: { hashedRefreshToken: null },
        });
    }

    private async generateTokens(userId: string, email: string, role: UserRole, name: string) {
        const payload = { sub: userId, email, role, name };

        const [accessToken, refreshToken] = await Promise.all([
            this.jwt.signAsync(payload, {
                secret: this.config.get<string>('JWT_SECRET'),
                expiresIn: '3d',
            }),
            this.jwt.signAsync(payload, {
                secret: this.config.get<string>('JWT_REFRESH_SECRET'),
                expiresIn: '7d',
            }),
        ]);

        return { accessToken, refreshToken };
    }

    private async saveRefreshToken(userId: string, refreshToken: string) {
        const hashed = await argon2.hash(refreshToken);
        await this.prisma.user.update({
            where: { id: userId },
            data: { hashedRefreshToken: hashed },
        });
    }
}
