import { Controller, Get, Patch, Param, Body, UseGuards, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AlertsService } from './alerts.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CreateAlertDto } from './dto/create-alert.dto';

@Controller('alerts')
@UseGuards(JwtGuard, RolesGuard)
export class AlertsController {
    constructor(private readonly alertsService: AlertsService) { }

    @Get()
    @Roles(UserRole.ADMIN, UserRole.AUDITOR)
    async findAll() {
        return this.alertsService.findAll();
    }

    // AJOUTER CETTE MÉTHODE : Elle gère le POST /alerts
    @Post()
    @Roles(UserRole.ADMIN, UserRole.AUDITOR)
    @UseInterceptors(FileInterceptor('image'))
    async create(@Body() createAlertDto: CreateAlertDto, @UploadedFile() image?: Express.Multer.File) {
        console.log('Payload reçu du mobile:', createAlertDto);
        return this.alertsService.create(createAlertDto, image);
    }

    // AJOUTER CETTE MÉTHODE : Elle gère le PATCH /alerts/:id
    @Patch(':id')
    @Roles(UserRole.ADMIN)
    async update(@Param('id') id: string, @Body('status') status: string) {
        return this.alertsService.updateStatus(id, status);
    }
}