import { Controller, Get, Param, UseGuards, Patch, Delete, Body, Post, Request } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CreateAssetDto } from './dto/create-asset.dto';

@Controller('assets')
@UseGuards(JwtGuard, RolesGuard)
export class AssetsController {
    constructor(private readonly assetsService: AssetsService) { }

    @Post()
    @Roles(UserRole.ADMIN)
    async create(@Body() dto: CreateAssetDto) {
        return this.assetsService.create(dto);
    }

    @Get()
    async findAll() {
        console.log('Requête reçue pour les actifs à', new Date());
        return this.assetsService.findAll();
    }

    @Get('tag/:tag_id')
    async getByTag(@Param('tag_id') tagId: string) {
        return this.assetsService.findByTag(tagId);
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN)
    async update(@Param('id') id: string, @Body() updateDto: any) {
        // Implementation for admin only
        return { message: 'Asset updated by admin' };
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    async remove(@Param('id') id: string) {
        // Implementation for admin only
        return { message: 'Asset deleted by admin' };
    }
}
