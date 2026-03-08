import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { LocationsService } from './locations.service';

@Controller('locations')
@UseGuards(JwtGuard, RolesGuard)
export class LocationsController {
    constructor(private readonly locationsService: LocationsService) { }

    @Get()
    @Roles(UserRole.ADMIN, UserRole.AUDITOR)
    async findAll() {
        return this.locationsService.findAll();
    }

    @Get(':id')
    @Roles(UserRole.ADMIN, UserRole.AUDITOR)
    async findOne(@Param('id') id: string) {
        return this.locationsService.findOne(id);
    }

    @Post()
    @Roles(UserRole.ADMIN)
    async create(@Body() dto: any) {
        return { message: 'Location created by admin' };
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN)
    async update(@Param('id') id: string, @Body() dto: any) {
        return { message: 'Location updated by admin' };
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    async remove(@Param('id') id: string) {
        return { message: 'Location deleted by admin' };
    }
}
