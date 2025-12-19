import { Injectable, NotFoundException } from '@nestjs/common';
import { PracticeMode, PracticeSource } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { CreatePracticeSessionDto } from './dto/create-practice-session.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';

@Injectable()
export class PracticeService {
  constructor(private readonly prisma: PrismaService) {}

  async startSession(userId: string, dto: CreatePracticeSessionDto) {
    const words = await this.prisma.word.findMany({
      where: { id: { in: dto.wordIds } }
    });
    if (!words.length) {
      throw new NotFoundException('未找到对应的练习单词');
    }
    const session = await this.prisma.practiceSession.create({
      data: {
        userId,
        mode: dto.mode,
        source: dto.source
      }
    });
    return {
      sessionId: session.id,
      payload: words
    };
  }

  async submitAttempt(userId: string, dto: SubmitAttemptDto) {
    const word = await this.prisma.word.findUnique({ where: { id: dto.wordId } });
    if (!word) {
      throw new NotFoundException('单词不存在');
    }
    const normalizedAnswer = dto.answer.trim().toLowerCase();
    const isCorrect = normalizedAnswer === word.text.toLowerCase();

    const attempt = await this.prisma.practiceAttempt.create({
      data: {
        sessionId: dto.sessionId,
        wordId: dto.wordId,
        prompt: dto.prompt,
        answer: dto.answer,
        isCorrect,
        mistakeCount: isCorrect ? 0 : dto.mistakeCount ?? 1,
        hintLevel: dto.hintLevel ?? 0
      }
    });

    await this.prisma.userWordProgress.upsert({
      where: { userId_wordId: { userId, wordId: dto.wordId } },
      update: {
        errorCount: {
          increment: isCorrect ? 0 : 1
        },
        lastPracticedAt: new Date()
      },
      create: {
        userId,
        wordId: dto.wordId,
        mastered: false,
        inNotebook: false,
        errorCount: isCorrect ? 0 : 1,
        lastPracticedAt: new Date()
      }
    });

    return { attemptId: attempt.id, isCorrect };
  }

  async revealHint(wordId: string, level: number) {
    const word = await this.prisma.word.findUnique({ where: { id: wordId } });
    if (!word) {
      throw new NotFoundException('单词不存在');
    }
    const nextLevel = Math.min(word.text.length, level + 1);
    return {
      hint: word.text.slice(0, nextLevel),
      level: nextLevel
    };
  }

  async getRecentSessions(userId: string, limit = 5) {
    return this.prisma.practiceSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { attempts: true }
    });
  }
}
