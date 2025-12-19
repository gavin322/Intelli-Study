import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateProgressDto {
  @ApiProperty({ description: '是否标记为掌握' })
  @IsBoolean()
  mastered!: boolean;

  @ApiProperty({ description: '是否加入生词本' })
  @IsBoolean()
  inNotebook!: boolean;
}
