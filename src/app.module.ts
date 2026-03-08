import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AssetsModule } from './assets/assets.module';
import { ScansModule } from './scans/scans.module';
import { LocationsModule } from './locations/locations.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    AssetsModule,
    ScansModule,
    LocationsModule,
    AiModule,
  ],
})
export class AppModule { }
