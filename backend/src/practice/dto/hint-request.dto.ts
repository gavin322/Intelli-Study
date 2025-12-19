import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';

export class HintRequestDto {
  @ApiProperty()
  @IsUUID('4')
  wordId!: string;

  @ApiProperty({ description: '当前已经展示的提示层级' })
  @IsInt()
  @Min(0)
  level!: number;
}
