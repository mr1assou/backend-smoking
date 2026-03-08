import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    signup(dto: SignupDto, res: Response): Promise<{
        accessToken: string;
    }>;
    login(dto: LoginDto, res: Response): Promise<{
        accessToken: string;
    }>;
    refresh(req: Request & {
        user: {
            sub: string;
            email: string;
            refreshToken: string;
        };
    }, res: Response): Promise<{
        accessToken: string;
    }>;
    logout(req: Request & {
        user: {
            sub: string;
        };
    }, res: Response): Promise<{
        message: string;
    }>;
    private setRefreshTokenCookie;
}
