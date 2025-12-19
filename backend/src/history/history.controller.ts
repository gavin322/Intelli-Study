import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { HistoryService } from './history.service';

@ApiTags('history')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get('timeline')
  async timeline(@CurrentUser() user: any) {
    return this.historyService.getLearningTimeline(user.id);
  }

  @Get('errors')
  async errors(@CurrentUser() user: any) {
    return this.historyService.getErrorWords(user.id);
  }
}
