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
exports.GoogleTokenService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const google_auth_library_1 = require("google-auth-library");
let GoogleTokenService = class GoogleTokenService {
    config;
    client = new google_auth_library_1.OAuth2Client();
    constructor(config) {
        this.config = config;
    }
    async verifyIdToken(idToken) {
        const clientId = this.getWebClientId();
        if (!clientId) {
            throw new common_1.InternalServerErrorException('Google OAuth is not configured');
        }
        try {
            const ticket = await this.client.verifyIdToken({
                idToken,
                audience: clientId,
            });
            const payload = ticket.getPayload();
            if (!payload?.email) {
                throw new common_1.UnauthorizedException('Google account has no email');
            }
            if (payload.email_verified === false) {
                throw new common_1.UnauthorizedException('Google email is not verified');
            }
            return { email: payload.email, name: payload.name };
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException)
                throw error;
            throw new common_1.UnauthorizedException('Invalid Google ID token');
        }
    }
    getWebClientId() {
        return (this.config.get('client_id')?.trim() ||
            this.config.get('GOOGLE_CLIENT_ID')?.trim());
    }
};
exports.GoogleTokenService = GoogleTokenService;
exports.GoogleTokenService = GoogleTokenService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GoogleTokenService);
//# sourceMappingURL=google-token.service.js.map