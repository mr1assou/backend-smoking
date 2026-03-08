import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('alerts')
@UseGuards(JwtGuard, RolesGuard)
export class AlertsController {
    constructor(private readonly alertsService: AlertsService) { }

    @Get()
    @Roles(UserRole.ADMIN, UserRole.AUDITOR)
    async findAll() {
        return this.alertsService.findAll();
    }

    // AJOUTER CETTE MÉTHODE : Elle gère le PATCH /alerts/:id
    @Patch(':id')
    @Roles(UserRole.ADMIN)
    async update(@Param('id') id: string, @Body('status') status: string) {
        return this.alertsService.updateStatus(id, status);
    }
}