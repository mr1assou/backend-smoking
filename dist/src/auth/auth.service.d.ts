import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleTokenService } from './google/google-token.service';
export type GoogleAuthResult = {
    accessToken: string;
    refreshToken: string;
    isNewUser: boolean;
    email: string;
};
export declare class AuthService {
    private readonly usersService;
    private readonly jwt;
    private readonly config;
    private readonly googleToken;
    constructor(usersService: UsersService, jwt: JwtService, config: ConfigService, googleToken: GoogleTokenService);
    signup(dto: SignupDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    googleSignIn(idToken: string): Promise<GoogleAuthResult>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    refresh(userId: number, refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(userId: number): Promise<void>;
    private issueTokensForUser;
    private generateTokens;
    private saveRefreshToken;
}
