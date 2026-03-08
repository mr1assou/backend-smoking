import { Controller, Get, Param, UseGuards, Post, Body, Patch, Delete } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('locations')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class LocationsController {
    constructor(private readonly locationsService: LocationsService) { }

    @Get()
    async findAll() {
        return this.locationsService.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.locationsService.findOne(id);
    }

    @Post()
    async create(@Body() dto: any) {
        return { message: 'Location created by admin' };
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() dto: any) {
        return { message: 'Location updated by admin' };
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return { message: 'Location deleted by admin' };
    }
}
