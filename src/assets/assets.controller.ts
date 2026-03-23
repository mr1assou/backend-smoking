import { Controller, Get, Param, UseGuards, Patch, Delete, Body, Post, Request, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '@prisma/client';
import { CreateAssetDto } from './dto/create-asset.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';

@Controller('assets')
@UseGuards(JwtGuard, RolesGuard)
export class AssetsController {
    constructor(private readonly assetsService: AssetsService) { }

    @Public()
    @Get('template')
    async getTemplate(@Res() res: Response) {
        const buffer = this.assetsService.getTemplate();
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="Template_AssetIQ.xlsx"',
            'Content-Length': buffer.length,
        });
        res.end(buffer);
    }

    @Post('import')
    @Roles(UserRole.ADMIN)
    @UseInterceptors(FileInterceptor('file'))
    async import(@UploadedFile() file: any) {
        console.log('Fichier reçu dans le contrôleur');
        return this.assetsService.importAssets(file.buffer);
    }

    @Delete('reset')
    @Roles(UserRole.ADMIN)
    async reset() {
        return this.assetsService.resetAll();
    }

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

    @Get('tag/:tagId')
    async getByTag(@Param('tagId') tagId: string) {
        console.log('Recherche par TAG RFID:', tagId);
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

    @Get(':id')
    async findOne(@Param('id') id: string) {
        console.log('REQUÊTE REÇUE POUR ID:', id);
        return { debug: true, id_recu: id };
    }
}
