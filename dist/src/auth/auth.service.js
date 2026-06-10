"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const crypto_1 = require("crypto");
const argon2 = __importStar(require("argon2"));
const users_service_1 = require("../users/users.service");
const auth_constants_1 = require("./auth.constants");
const google_token_service_1 = require("./google/google-token.service");
let AuthService = class AuthService {
    usersService;
    jwt;
    config;
    googleToken;
    constructor(usersService, jwt, config, googleToken) {
        this.usersService = usersService;
        this.jwt = jwt;
        this.config = config;
        this.googleToken = googleToken;
    }
    async signup(dto) {
        const hashedPassword = await argon2.hash(dto.password);
        const user = await this.usersService.createWithHashedPassword(dto.email, hashedPassword);
        return this.issueTokensForUser(user.user_id, user.email);
    }
    async googleSignIn(idToken) {
        const googleUser = await this.googleToken.verifyIdToken(idToken);
        const email = googleUser.email.trim().toLowerCase();
        const password = await argon2.hash((0, crypto_1.randomBytes)(32).toString('hex'));
        const { user, isNewUser } = await this.usersService.findOrCreateByEmail(email, password);
        const tokens = await this.issueTokensForUser(user.user_id, user.email);
        return { ...tokens, isNewUser, email: user.email };
    }
    async login(dto) {
        const user = await this.usersService.findByEmail(dto.email);
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const passwordMatches = await argon2.verify(user.password, dto.password);
        if (!passwordMatches)
            throw new common_1.ForbiddenException('Invalid credentials');
        return this.issueTokensForUser(user.user_id, user.email);
    }
    async refresh(userId, refreshToken) {
        const user = await this.usersService.findById(userId);
        if (!user || !user.hashedRefreshToken)
            throw new common_1.ForbiddenException('Access denied');
        const tokenMatches = await argon2.verify(user.hashedRefreshToken, refreshToken);
        if (!tokenMatches)
            throw new common_1.ForbiddenException('Access denied');
        return this.issueTokensForUser(user.user_id, user.email);
    }
    async logout(userId) {
        await this.usersService.setRefreshTokenHash(userId, null);
    }
    async issueTokensForUser(userId, email) {
        const tokens = await this.generateTokens(userId, email);
        await this.saveRefreshToken(userId, tokens.refreshToken);
        return tokens;
    }
    async generateTokens(userId, email) {
        const payload = { sub: userId, email };
        const [accessToken, refreshToken] = await Promise.all([
            this.jwt.signAsync(payload, {
                secret: this.config.get('JWT_SECRET'),
                expiresIn: auth_constants_1.ACCESS_TOKEN_EXPIRES_IN,
            }),
            this.jwt.signAsync(payload, {
                secret: this.config.get('JWT_REFRESH_SECRET'),
                expiresIn: auth_constants_1.REFRESH_TOKEN_EXPIRES_IN,
            }),
        ]);
        return { accessToken, refreshToken };
    }
    async saveRefreshToken(userId, refreshToken) {
        const hashed = await argon2.hash(refreshToken);
        await this.usersService.setRefreshTokenHash(userId, hashed);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        config_1.ConfigService,
        google_token_service_1.GoogleTokenService])
], AuthService);
//# sourceMappingURL=auth.service.js.map