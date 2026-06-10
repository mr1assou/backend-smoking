"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleOAuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const google_auth_library_1 = require("google-auth-library");
const auth_service_1 = require("../auth.service");
let GoogleOAuthService = class GoogleOAuthService {
    config;
    jwt;
    authService;
    constructor(config, jwt, authService) {
        this.config = config;
        this.jwt = jwt;
        this.authService = authService;
    }
    createAuthorizationUrl(returnUrl) {
        if (!this.isAllowedReturnUrl(returnUrl)) {
            throw new common_1.BadRequestException('Invalid return URL');
        }
        const client = this.getOAuthClient();
        const state = this.jwt.sign({ returnUrl }, {
            secret: this.config.get('JWT_SECRET'),
            expiresIn: '10m',
        });
        return client.generateAuthUrl({
            access_type: 'online',
            scope: ['openid', 'email', 'profile'],
            state,
            prompt: 'select_account',
        });
    }
    async handleCallback(code, state) {
        if (!code?.trim() || !state?.trim()) {
            throw new common_1.BadRequestException('Missing OAuth parameters');
        }
        let returnUrl;
        try {
            const payload = await this.jwt.verifyAsync(state, {
                secret: this.config.get('JWT_SECRET'),
            });
            returnUrl = payload.returnUrl;
        }
        catch {
            throw new common_1.BadRequestException('Invalid or expired OAuth state');
        }
        if (!this.isAllowedReturnUrl(returnUrl)) {
            throw new common_1.BadRequestException('Invalid return URL');
        }
        try {
            const client = this.getOAuthClient();
            const { tokens } = await client.getToken(code);
            const idToken = tokens.id_token;
            if (!idToken) {
                throw new common_1.InternalServerErrorException('Google did not return an ID token');
            }
            const auth = await this.authService.googleSignIn(idToken);
            return this.appendQueryParams(returnUrl, {
                accessToken: auth.accessToken,
                refreshToken: auth.refreshToken,
                email: auth.email,
                isNewUser: auth.isNewUser ? '1' : '0',
            });
        }
        catch (error) {
            const raw = error instanceof Error ? error.message : 'Google sign-in failed';
            const message = raw.split('\n').at(0)?.trim().slice(0, 150) ?? raw;
            return this.appendQueryParams(returnUrl, { error: message });
        }
    }
    getOAuthClient() {
        const clientId = this.config.get('client_id')?.trim();
        const clientSecret = this.config.get('client_secret')?.trim();
        const redirectUri = this.getRedirectUri();
        if (!clientId || !clientSecret || !redirectUri) {
            throw new common_1.InternalServerErrorException('Google OAuth is not configured');
        }
        return new google_auth_library_1.OAuth2Client(clientId, clientSecret, redirectUri);
    }
    getRedirectUri() {
        const configured = this.config.get('GOOGLE_REDIRECT_URI')?.trim();
        if (configured)
            return configured;
        const base = this.config.get('API_PUBLIC_URL')?.trim();
        if (base) {
            return `${base.replace(/\/$/, '')}/auth/google/callback`;
        }
        throw new common_1.InternalServerErrorException('Set GOOGLE_REDIRECT_URI or API_PUBLIC_URL in .env');
    }
    isAllowedReturnUrl(url) {
        return (url.startsWith('exp://') ||
            url.startsWith('quitsmoking://') ||
            url.startsWith('http://localhost') ||
            url.startsWith('http://127.0.0.1') ||
            url.startsWith('http://192.168.'));
    }
    appendQueryParams(base, params) {
        const separator = base.includes('?') ? '&' : '?';
        return `${base}${separator}${new URLSearchParams(params).toString()}`;
    }
};
exports.GoogleOAuthService = GoogleOAuthService;
exports.GoogleOAuthService = GoogleOAuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        jwt_1.JwtService,
        auth_service_1.AuthService])
], GoogleOAuthService);
//# sourceMappingURL=google-oauth.service.js.map