import { ApiProperty } from '@nestjs/swagger';
import { PracticeMode, PracticeSource } from '@prisma/client';
import { ArrayNotEmpty, IsArray, IsEnum, IsUUID } from 'class-validator';

export class CreatePracticeSessionDto {
  @ApiProperty({ enum: PracticeMode, description: '练习模式：中文提示/听音' })
  @IsEnum(PracticeMode)
  mode!: PracticeMode;

  @ApiProperty({ enum: PracticeSource })
  @IsEnum(PracticeSource)
  source!: PracticeSource;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  wordIds!: string[];
}
