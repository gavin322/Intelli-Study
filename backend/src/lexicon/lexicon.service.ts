import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LexiconService {
  constructor(private readonly prisma: PrismaService) {}

  async findSources() {
    return this.prisma.lexiconSource.findMany({
      orderBy: { createdAt: 'asc' }
    });
  }

  async getSourceWordStats(pageSize: number) {
    const sources = await this.prisma.lexiconSource.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true
      }
    });

    const grouped = await this.prisma.word.groupBy({
      by: ['sourceId'],
      _count: { _all: true }
    });

    const countMap = new Map<string, number>();
    for (const item of grouped) {
      if (!item.sourceId) continue;
      countMap.set(item.sourceId, item._count._all);
    }

    return sources.map((s) => {
      const wordCount = countMap.get(s.id) ?? 0;
      const pageCount = pageSize > 0 ? Math.ceil(wordCount / pageSize) : 0;
      return {
        ...s,
        wordCount,
        pageCount,
        pageSize
      };
    });
  }

  async findWords(params: {
    page: number;
    pageSize: number;
    sourceId?: string;
    onlyUnlearned?: boolean;
    userId?: string;
  }) {
    const { page, pageSize, sourceId, onlyUnlearned, userId } = params;

    const where: Prisma.WordWhereInput = {
      ...(sourceId ? { sourceId } : {}),
      ...(onlyUnlearned && userId
        ? {
            progresses: {
              none: {
                userId
              }
            }
          }
        : {})
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.word.findMany({
        where,
        orderBy: { text: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.word.count({ where })
    ]);
    return { items, total, page, pageSize };
  }

  async findPhrases(params: { page: number; pageSize: number; sourceId?: string }) {
    const { page, pageSize, sourceId } = params;
    const where: Prisma.PhraseWhereInput = sourceId ? { sourceId } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.phrase.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.phrase.count({ where })
    ]);
    return { items, total, page, pageSize };
  }

  async upsertWordProgress(
    userId: string,
    wordId: string,
    data: { mastered: boolean; inNotebook: boolean }
  ) {
    return this.prisma.userWordProgress.upsert({
      where: {
        userId_wordId: { userId, wordId }
      },
      update: {
        mastered: data.mastered,
        inNotebook: data.inNotebook
      },
      create: {
        userId,
        wordId,
        mastered: data.mastered,
        inNotebook: data.inNotebook
      }
    });
  }

  async markWordLearned(userId: string, wordId: string) {
    // “学习过”只需要在 UserWordProgress 里留下记录即可；不要覆盖 mastered / inNotebook。
    // 如果已存在记录（唯一键 userId+wordId），忽略即可。
    try {
      return await this.prisma.userWordProgress.create({
        data: { userId, wordId }
      });
    } catch (err: any) {
      // Prisma unique constraint
      if (err?.code === 'P2002') return null;
      throw err;
    }
  }

  async getLearningStats(userId: string, sourceId?: string) {
    const whereProgress: Prisma.UserWordProgressWhereInput = {
      userId,
      ...(sourceId
        ? {
            word: {
              sourceId
            }
          }
        : {})
    };

    const [learnedCount, totalCount] = await this.prisma.$transaction([
      this.prisma.userWordProgress.count({ where: whereProgress }),
      this.prisma.word.count({ where: sourceId ? { sourceId } : {} })
    ]);

    const remainingCount = Math.max(0, totalCount - learnedCount);
    return { learnedCount, totalCount, remainingCount, sourceId: sourceId ?? null };
  }
}
