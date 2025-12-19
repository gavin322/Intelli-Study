import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { CreatePracticeSessionDto } from './dto/create-practice-session.dto';
import { HintRequestDto } from './dto/hint-request.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';
import { PracticeService } from './practice.service';

@ApiTags('practice')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('practice')
export class PracticeController {
  constructor(private readonly practiceService: PracticeService) {}

  @Post('sessions')
  async createSession(@CurrentUser() user: any, @Body() dto: CreatePracticeSessionDto) {
    // 返回 sessionId 与题目列表，前端可立即开始练习
    return this.practiceService.startSession(user.id, dto);
  }

  @Post('attempts')
  async submitAttempt(@CurrentUser() user: any, @Body() dto: SubmitAttemptDto) {
    return this.practiceService.submitAttempt(user.id, dto);
  }

  @Post('hints')
  async getHint(@Body() dto: HintRequestDto) {
    return this.practiceService.revealHint(dto.wordId, dto.level);
  }

  @Get('sessions/recent')
  async recentSessions(@CurrentUser() user: any) {
    return this.practiceService.getRecentSessions(user.id);
  }
}
