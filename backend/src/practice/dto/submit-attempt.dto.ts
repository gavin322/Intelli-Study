import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, Min, IsInt } from 'class-validator';

export class SubmitAttemptDto {
  @ApiProperty()
  @IsUUID('4')
  sessionId!: string;

  @ApiProperty()
  @IsUUID('4')
  wordId!: string;

  @ApiProperty({ description: '题目提示（中文释义或音频描述）' })
  @IsString()
  prompt!: string;

  @ApiProperty({ description: '用户输入的答案' })
  @IsString()
  @IsNotEmpty()
  answer!: string;

  @ApiProperty({ required: false, description: '本题错误次数' })
  @IsOptional()
  @IsInt()
  @Min(0)
  mistakeCount?: number;

  @ApiProperty({ required: false, description: '当前提示字母数量' })
  @IsOptional()
  @IsInt()
  @Min(0)
  hintLevel?: number;
}
