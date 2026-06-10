import {
  Body,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CreateSlipEventDto } from './dto/create-slip-event.dto';
import { SlipEventsService } from './slip-events.service';

@Controller('auth/me/slip-events')
export class SlipEventsController {
  constructor(private readonly slipEventsService: SlipEventsService) {}

  @UseGuards(JwtGuard)
  @Post()
  create(
    @Req() req: Request & { user: { userId: number } },
    @Body() dto: CreateSlipEventDto,
  ) {
    return this.slipEventsService.create(req.user.userId, dto);
  }

  @UseGuards(JwtGuard)
  @Delete(':id')
  remove(
    @Req() req: Request & { user: { userId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.slipEventsService.remove(req.user.userId, id);
  }
}
