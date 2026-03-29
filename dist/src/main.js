"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const express_1 = require("express");
const common_1 = require("@nestjs/common");
const fs_1 = require("fs");
async function bootstrap() {
    (0, fs_1.mkdirSync)('uploads', { recursive: true });
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    const corsOrigin = process.env.CORS_ORIGIN?.trim();
    if (!corsOrigin) {
        throw new Error('CORS_ORIGIN must be set in .env');
    }
    app.enableCors({
        origin: corsOrigin,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
    });
    app.use((0, express_1.json)({ limit: '50mb' }));
    app.use((0, express_1.urlencoded)({ extended: true, limit: '50mb' }));
    app.getHttpAdapter().get('/', (req, res) => {
        res.json({ message: 'Welcome to Hotel Royal Manssour API! 🏨' });
    });
    await app.listen(3001, '0.0.0.0');
    console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
//# sourceMappingURL=main.js.map