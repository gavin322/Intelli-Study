import { INestApplication, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.get<string>('app.databaseUrl')
        }
      }
    });
  }

  async onModuleInit() {
    this.logger.log('Connecting database...');
    await this.$connect();
  }

  // 在 NestJS 9+ 中，推荐使用 OnModuleDestroy 接口来处理断开连接
  // 因此移除了 enableShutdownHooks 方法，该方法使用了 PrismaClient 不再支持的 'beforeExit' 事件

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
