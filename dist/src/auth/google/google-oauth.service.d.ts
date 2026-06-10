import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';
export declare class GoogleOAuthService {
    private config;
    private jwt;
    private authService;
    constructor(config: ConfigService, jwt: JwtService, authService: AuthService);
    createAuthorizationUrl(returnUrl: string): string;
    handleCallback(code: string, state: string): Promise<string>;
    private getOAuthClient;
    private getRedirectUri;
    private isAllowedReturnUrl;
    private appendQueryParams;
}
