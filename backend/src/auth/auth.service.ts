import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { UsersService } from '../users/users.service';

import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async register(payload: RegisterDto) {
    const existing = await this.usersService.findByEmail(payload.email);
    if (existing) {
      throw new BadRequestException('邮箱已注册');
    }
    const password = await bcrypt.hash(payload.password, 10);
    const user = await this.usersService.create({
      email: payload.email,
      password,
      displayName: payload.displayName ?? payload.email.split('@')[0]
    });
    return this.signToken(user.id, user.email);
  }

  async login(payload: LoginDto) {
    const user = await this.usersService.findByEmail(payload.email);
    if (!user) {
      throw new UnauthorizedException('账号或密码错误');
    }
    const isValid = await bcrypt.compare(payload.password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('账号或密码错误');
    }
    return this.signToken(user.id, user.email);
  }

  async forgotPassword(payload: ForgotPasswordDto) {
    // 这里只是预留接口，真实项目需要邮件服务
    const user = await this.usersService.findByEmail(payload.email);
    if (!user) {
      throw new BadRequestException('该邮箱未注册');
    }
    return { message: '密码重置邮件已发送（示例环境仅返回成功）' };
  }

  private async signToken(userId: string, email: string) {
    const accessToken = await this.jwtService.signAsync({ sub: userId, email });
    return { accessToken };
  }
}
