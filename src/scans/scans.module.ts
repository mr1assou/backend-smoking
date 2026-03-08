import { Module } from '@nestjs/common';
import { ScansService } from './scans.service';
import { ScansController } from './scans.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [ScansService],
    controllers: [ScansController],
})
export class ScansModule { }
