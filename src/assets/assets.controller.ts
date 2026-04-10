import {
  Controller,
  Get,
  Param,
  UseGuards,
  Patch,
  Delete,
  Body,
  Post,
  UseInterceptors,
  UploadedFile,
  Res,
  Query,
} from '@nestjs/common';
import { AssetsService } from './assets.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '@prisma/client';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';

@Controller('assets')
@UseGuards(JwtGuard, RolesGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  // ── Template Excel ─────────────────────────────────────────────────────────

  @Public()
  @Get('template')
  async getTemplate(@Res() res: Response) {
    const buffer = this.assetsService.getTemplate();
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="Template_AssetIQ.xlsx"',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  // ── Import Excel ───────────────────────────────────────────────────────────

  @Post('import')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async import(@UploadedFile() file: any) {
    console.log('Import Excel reçu');
    return this.assetsService.importAssets(file.buffer);
  }

  // ── Reset BD ───────────────────────────────────────────────────────────────

  @Delete('reset')
  @Roles(UserRole.ADMIN)
  async reset() {
    return this.assetsService.resetAll();
  }

  // ── Actifs sans tag (en attente d'enrôlement) ──────────────────────────────

  @Get('untagged')
  async findUntagged() {
    return this.assetsService.findUntagged();
  }

  // ── Actifs orphelins avec recherche (utilisé par le mobile) ────────────────

  @Get('orphans')
  async findOrphans(@Query('q') q?: string) {
    return this.assetsService.findOrphans(q);
  }

  // ── Catégories ─────────────────────────────────────────────────────────────

  @Public()
  @Get('categories')
  async getCategories() {
    return this.assetsService.getCategories();
  }

  // ── Recherche par Tag RFID ─────────────────────────────────────────────────

  @Get('tag/:tagId')
  async getByTag(@Param('tagId') tagId: string) {
    console.log('Recherche par TAG RFID:', tagId);
    return this.assetsService.findByTag(tagId);
  }

  // ── Création manuelle ──────────────────────────────────────────────────────

  @Post()
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreateAssetDto) {
    return this.assetsService.create(dto);
  }

  // ── Liste complète ─────────────────────────────────────────────────────────

  @Get()
  async findAll() {
    return this.assetsService.findAll();
  }

  // ── Enrôlement : associer un tag RFID à un actif existant ─────────────────
  // PATCH /assets/:id/enroll  { tag_id: "RFID-XXX", location_id?: "uuid" }

  @Patch(':id/enroll')
  async enroll(
    @Param('id') id: string,
    @Body('tag_id') tagId: string,
    @Body('location_id') locationId?: string,
  ) {
    return this.assetsService.enrollTag(id, tagId, locationId);
  }

  // ── Mise à jour générale d'un actif ───────────────────────────────────────

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() body: UpdateAssetDto) {
    return this.assetsService.updateAsset(id, body);
  }

  // ── Fiche actif ────────────────────────────────────────────────────────────

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  // ── Suppression ────────────────────────────────────────────────────────────

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    return this.assetsService.removeAsset(id);
  }
}
