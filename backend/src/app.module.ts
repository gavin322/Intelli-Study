import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { appConfig } from './config/app.config';
import { jwtConfig } from './config/jwt.config';
import { HistoryModule } from './history/history.module';
import { LexiconModule } from './lexicon/lexicon.module';
import { PracticeModule } from './practice/practice.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, jwtConfig]
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    LexiconModule,
    PracticeModule,
    HistoryModule
  ],
  controllers: [AppController]
})
export class AppModule {}
