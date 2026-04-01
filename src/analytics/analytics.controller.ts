import { Controller, Get, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('analytics')
@UseGuards(JwtGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('financial')
  getFinancial() {
    return this.analytics.getFinancial();
  }

  @Get('scans')
  getScans() {
    return this.analytics.getScans();
  }

  @Get('performance')
  getPerformance() {
    return this.analytics.getPerformance();
  }

  @Get('compliance')
  getCompliance() {
    return this.analytics.getCompliance();
  }
}
