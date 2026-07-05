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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const signup_dto_1 = require("./dto/signup.dto");
const login_dto_1 = require("./dto/login.dto");
const google_auth_dto_1 = require("./dto/google-auth.dto");
const google_oauth_service_1 = require("./google/google-oauth.service");
const auth_constants_1 = require("./auth.constants");
const jwt_refresh_guard_1 = require("./guards/jwt-refresh.guard");
const jwt_guard_1 = require("./guards/jwt.guard");
let AuthController = class AuthController {
    authService;
    googleOAuth;
    constructor(authService, googleOAuth) {
        this.authService = authService;
        this.googleOAuth = googleOAuth;
    }
    async signup(dto, res) {
        const { accessToken, refreshToken } = await this.authService.signup(dto);
        this.setRefreshTokenCookie(res, refreshToken);
        return { accessToken };
    }
    getGoogleAuthUrl(returnUrl) {
        if (!returnUrl?.trim()) {
            throw new common_1.BadRequestException('returnUrl is required');
        }
        return { url: this.googleOAuth.createAuthorizationUrl(returnUrl) };
    }
    async googleCallback(code, state, res) {
        const redirectUrl = await this.googleOAuth.handleCallback(code, state);
        res.redirect(redirectUrl);
    }
    async google(dto, res) {
        const { accessToken, refreshToken, isNewUser, email } = await this.authService.googleSignIn(dto.idToken);
        this.setRefreshTokenCookie(res, refreshToken);
        return { accessToken, refreshToken, isNewUser, email };
    }
    async googleLogin(dto, res) {
        const { accessToken, refreshToken, isNewUser, email } = await this.authService.googleLogin(dto.idToken);
        this.setRefreshTokenCookie(res, refreshToken);
        return { accessToken, refreshToken, isNewUser, email };
    }
    async googleSignup(dto, res) {
        const { accessToken, refreshToken, isNewUser, email } = await this.authService.googleSignup(dto.idToken);
        this.setRefreshTokenCookie(res, refreshToken);
        return { accessToken, refreshToken, isNewUser, email };
    }
    async login(dto, res) {
        const { accessToken, refreshToken } = await this.authService.login(dto);
        this.setRefreshTokenCookie(res, refreshToken);
        return { accessToken, refreshToken };
    }
    async refresh(req, res) {
        const { accessToken, refreshToken } = await this.authService.refresh(req.user.userId, req.user.refreshToken);
        this.setRefreshTokenCookie(res, refreshToken);
        return { accessToken };
    }
    async logout(req, res) {
        await this.authService.logout(req.user.userId);
        res.clearCookie('refresh_token');
        return { message: 'Logged out successfully' };
    }
    setRefreshTokenCookie(res, token) {
        res.cookie('refresh_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: auth_constants_1.REFRESH_COOKIE_MAX_AGE_MS,
        });
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('signup'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [signup_dto_1.SignupDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "signup", null);
__decorate([
    (0, common_1.Get)('google/url'),
    __param(0, (0, common_1.Query)('returnUrl')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "getGoogleAuthUrl", null);
__decorate([
    (0, common_1.Get)('google/callback'),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "googleCallback", null);
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.Post)('google'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [google_auth_dto_1.GoogleAuthDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "google", null);
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.Post)('google/login'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [google_auth_dto_1.GoogleAuthDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "googleLogin", null);
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.Post)('google/signup'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [google_auth_dto_1.GoogleAuthDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "googleSignup", null);
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(jwt_refresh_guard_1.JwtRefreshGuard),
    (0, common_1.Post)('refresh'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Post)('logout'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        google_oauth_service_1.GoogleOAuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map