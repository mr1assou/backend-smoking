"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const chat_module_1 = require("./chat/chat.module");
const auth_module_1 = require("./auth/auth.module");
const user_profiles_module_1 = require("./user-profiles/user-profiles.module");
const leaderboard_module_1 = require("./leaderboard/leaderboard.module");
const presence_module_1 = require("./presence/presence.module");
const posts_module_1 = require("./posts/posts.module");
const prisma_module_1 = require("./prisma/prisma.module");
const redis_module_1 = require("./redis/redis.module");
const relax_sounds_module_1 = require("./relax-sounds/relax-sounds.module");
const storage_module_1 = require("./storage/storage.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            prisma_module_1.PrismaModule,
            redis_module_1.RedisModule,
            presence_module_1.PresenceModule,
            leaderboard_module_1.LeaderboardModule,
            user_profiles_module_1.UserProfilesModule,
            auth_module_1.AuthModule,
            storage_module_1.StorageModule,
            posts_module_1.PostsModule,
            chat_module_1.ChatModule,
            relax_sounds_module_1.RelaxSoundsModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map