import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { LexiconController } from './lexicon.controller';
import { LexiconService } from './lexicon.service';

@Module({
  imports: [PrismaModule],
  controllers: [LexiconController],
  providers: [LexiconService],
  exports: [LexiconService]
})
export class LexiconModule {}
