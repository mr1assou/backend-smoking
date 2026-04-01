import {
    Controller,
    Post,
    Patch,
    Get,
    Param,
    Body,
    UseGuards,
    Request,
    ParseUUIDPipe,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SubmitTagsDto } from './dto/submit-tags.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('inventory')
@UseGuards(JwtGuard, RolesGuard)
export class InventoryController {
    constructor(private readonly inventoryService: InventoryService) {}

    // POST /inventory/sessions
    @Post('sessions')
    @Roles(UserRole.AUDITOR, UserRole.ADMIN)
    async createSession(@Request() req: any, @Body() dto: CreateSessionDto) {
        const userId = req.user.id || req.user.sub;
        return this.inventoryService.createSession(dto, userId);
    }

    // POST /inventory/sessions/:id/tags
    @Post('sessions/:id/tags')
    @Roles(UserRole.AUDITOR, UserRole.ADMIN)
    async submitTags(
        @Request() req: any,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: SubmitTagsDto,
    ) {
        const userId = req.user.id || req.user.sub;
        return this.inventoryService.submitTags(id, dto, userId);
    }

    // PATCH /inventory/sessions/:id/close
    @Patch('sessions/:id/close')
    @Roles(UserRole.AUDITOR, UserRole.ADMIN)
    async closeSession(@Param('id', ParseUUIDPipe) id: string) {
        return this.inventoryService.closeSession(id);
    }

    // GET /inventory/sessions
    @Get('sessions')
    @Roles(UserRole.AUDITOR, UserRole.ADMIN)
    async findAll() {
        return this.inventoryService.findAll();
    }

    // GET /inventory/sessions/:id
    @Get('sessions/:id')
    @Roles(UserRole.AUDITOR, UserRole.ADMIN)
    async findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.inventoryService.findOne(id);
    }
}
