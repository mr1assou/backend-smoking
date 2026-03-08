import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ScansService } from './scans.service';
import { CreateScanDto } from './dto/create-scan.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';

@Controller('scan')
export class ScansController {
    constructor(private readonly scansService: ScansService) { }

    @UseGuards(JwtGuard)
    @Post()
    async createScan(@Request() req: any, @Body() dto: CreateScanDto) {
        return this.scansService.registerScan(dto, req.user.sub);
    }
}
