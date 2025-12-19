import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'study@example.com' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  email!: string;

  @ApiProperty({ minLength: 8, description: '至少8位，包含大小写和数字' })
  @IsString()
  @MinLength(8, { message: '密码长度至少8位' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, { message: '密码需包含大小写字母和数字' })
  password!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  displayName?: string;
}
