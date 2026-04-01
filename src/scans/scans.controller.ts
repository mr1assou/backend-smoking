import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
} from '@nestjs/common';
import { ScansService } from './scans.service';
import { CreateScanDto } from './dto/create-scan.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CreateMassScanDto } from './dto/create-mass-scan.dto';

@Controller('scan')
@UseGuards(JwtGuard, RolesGuard)
export class ScansController {
  constructor(private readonly scansService: ScansService) {}

  @Get('recent')
  @Roles(UserRole.AUDITOR, UserRole.ADMIN)
  async getRecent() {
    return this.scansService.findRecent();
  }

  @Post()
  @Roles(UserRole.AUDITOR, UserRole.ADMIN)
  async createScan(@Request() req: any, @Body() dto: CreateScanDto) {
    const userId = req.user.id || req.user.sub;
    return this.scansService.registerScan(dto, userId);
  }

  @Post('mass')
  @Roles(UserRole.AUDITOR, UserRole.ADMIN)
  async createMassScan(@Request() req: any, @Body() dto: CreateMassScanDto) {
    const userId = req.user.id || req.user.sub;
    return this.scansService.registerMassScan(dto, userId);
  }
}
