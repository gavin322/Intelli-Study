import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HistoryService {
  constructor(private readonly prisma: PrismaService) {}

  getLearningTimeline(userId: string) {
    return this.prisma.practiceAttempt.findMany({
      where: { session: { userId } },
      orderBy: { createdAt: 'desc' },
      include: { word: true, session: true },
      take: 100
    });
  }

  getErrorWords(userId: string) {
    return this.prisma.userWordProgress.findMany({
      where: { userId, errorCount: { gt: 0 } },
      include: { word: true },
      orderBy: { errorCount: 'desc' }
    });
  }
}
