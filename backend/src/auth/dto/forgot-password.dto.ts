import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty()
  @IsEmail({}, { message: '请输入正确的邮箱' })
  email!: string;
}
