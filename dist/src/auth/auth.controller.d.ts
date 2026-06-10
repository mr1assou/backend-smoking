import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { GoogleOAuthService } from './google/google-oauth.service';
export declare class AuthController {
    private authService;
    private googleOAuth;
    constructor(authService: AuthService, googleOAuth: GoogleOAuthService);
    signup(dto: SignupDto, res: Response): Promise<{
        accessToken: string;
    }>;
    getGoogleAuthUrl(returnUrl: string): {
        url: string;
    };
    googleCallback(code: string, state: string, res: Response): Promise<void>;
    google(dto: GoogleAuthDto, res: Response): Promise<{
        accessToken: string;
        refreshToken: string;
        isNewUser: boolean;
        email: string;
    }>;
    login(dto: LoginDto, res: Response): Promise<{
        accessToken: string;
    }>;
    refresh(req: Request & {
        user: {
            userId: number;
            email: string;
            refreshToken: string;
        };
    }, res: Response): Promise<{
        accessToken: string;
    }>;
    logout(req: Request & {
        user: {
            userId: number;
        };
    }, res: Response): Promise<{
        message: string;
    }>;
    private setRefreshTokenCookie;
}
