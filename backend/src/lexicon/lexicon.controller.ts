import { Controller, Get, Query, UseGuards, Param, ParseUUIDPipe, Body, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';

import { LexiconService } from './lexicon.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateProgressDto } from './dto/update-progress.dto';

@ApiTags('lexicon')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('lexicon')
export class LexiconController {
  constructor(private readonly lexiconService: LexiconService) {}

  @Get('sources')
  async getSources() {
    // 返回词库来源列表，供前端下拉选择
    return this.lexiconService.findSources();
  }

  @Get('sources/stats')
  async getSourceStats(@Query('pageSize') pageSize = 20) {
    // 返回每个词库的总词数与页数（按 pageSize 分组）
    return this.lexiconService.getSourceWordStats(Number(pageSize));
  }

  @Get('words')
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 10 })
  @ApiQuery({ name: 'onlyUnlearned', required: false, example: false })
  async getWords(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
    @Query('sourceId') sourceId?: string,
    @Query('onlyUnlearned') onlyUnlearned?: string,
    @CurrentUser() user?: any
  ) {
    // 提供分页的单词卡片列表，前端可根据 sourceId 筛选词库
    return this.lexiconService.findWords({
      page: Number(page),
      pageSize: Number(pageSize),
      sourceId,
      onlyUnlearned: onlyUnlearned === 'true' || onlyUnlearned === '1',
      userId: user?.id
    });
  }

  @Get('phrases')
  async getPhrases(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
    @Query('sourceId') sourceId?: string
  ) {
    return this.lexiconService.findPhrases({
      page: Number(page),
      pageSize: Number(pageSize),
      sourceId
    });
  }

  @Patch('words/:wordId/progress')
  async updateProgress(
    @Param('wordId', new ParseUUIDPipe()) wordId: string,
    @Body() dto: UpdateProgressDto,
    @CurrentUser() user: any
  ) {
    return this.lexiconService.upsertWordProgress(user.id, wordId, dto);
  }

  @Post('words/:wordId/learned')
  async markLearned(
    @Param('wordId', new ParseUUIDPipe()) wordId: string,
    @CurrentUser() user: any
  ) {
    return this.lexiconService.markWordLearned(user.id, wordId);
  }

  @Get('learning/stats')
  async getLearningStats(@Query('sourceId') sourceId: string | undefined, @CurrentUser() user: any) {
    return this.lexiconService.getLearningStats(user.id, sourceId);
  }
}
