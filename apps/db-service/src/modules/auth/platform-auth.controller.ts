import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Auth, CurrentUser } from '@/common/decorators/auth.decorator';
import { RateLimit } from '@/common/decorators/metadata';
import { success } from '@/common/http/api-result';
import { AuthService } from './auth.service';
import {
  requestVerificationCodeSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  type RequestVerificationCodeInput,
  type ResetPasswordInput,
  type SignInInput,
  type SignUpInput,
} from './schemas';

// 单 IP 的总量限制；账号维度的限流在 AuthService 里做
const SIGN_IN_IP_RATE_LIMIT = { scope: 'auth:sign-in:ip', windowSeconds: 15 * 60, max: 30 };
const SIGN_UP_IP_RATE_LIMIT = { scope: 'auth:sign-up:ip', windowSeconds: 60 * 60, max: 10 };
const SEND_CODE_IP_RATE_LIMIT = { scope: 'auth:send-code:ip', windowSeconds: 60 * 60, max: 10 };

/**
 * platform 前台会话接口，只认 user 会话；路径与迁移前的 `/api/*` 一一对应，
 * platform 经 Next rewrites 把 `/api/:path*` 转发到这里的 `platform/:path*`。
 */
@ApiTags('Platform Auth')
@Controller('platform')
export class PlatformAuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('code')
  @HttpCode(200)
  @RateLimit(SEND_CODE_IP_RATE_LIMIT)
  @ApiOperation({ summary: 'Send a sign-in / sign-up verification code' })
  async sendCode(
    @Body({ schema: requestVerificationCodeSchema }) body: RequestVerificationCodeInput,
  ) {
    return success(await this.auth.sendVerificationCode(body), '验证码已发送，1 分钟内有效');
  }

  @Post('sign-up')
  @RateLimit(SIGN_UP_IP_RATE_LIMIT)
  @ApiOperation({ summary: 'Sign up with an email verification code' })
  async signUp(@Body({ schema: signUpSchema }) body: SignUpInput) {
    return success(await this.auth.signUp(body), '注册成功，请登录', 201);
  }

  @Post('sign-in')
  @HttpCode(200)
  @RateLimit(SIGN_IN_IP_RATE_LIMIT)
  @ApiOperation({ summary: 'Sign in with password or email verification code' })
  async signIn(
    @Body({ schema: signInSchema }) body: SignInInput,
    @Res({ passthrough: true }) response: Response,
  ) {
    return success(await this.auth.signIn(body, response), '登录成功');
  }

  @Post('sign-out')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign out the current platform session' })
  async signOut(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return success(await this.auth.signOut(request, response, 'user'), '退出登录成功');
  }

  @Get('me')
  @Auth()
  @ApiOperation({ summary: 'Get the current platform user, roles and permissions' })
  async me(@CurrentUser() user: AuthUser) {
    return success(await this.auth.getAuthPayload(user));
  }

  @Post('reset-password/code')
  @HttpCode(200)
  @Auth()
  @RateLimit(SEND_CODE_IP_RATE_LIMIT)
  @ApiOperation({ summary: 'Send a reset-password code to the current account email' })
  async sendResetPasswordCode(@CurrentUser() user: AuthUser) {
    return success(await this.auth.sendResetPasswordCode(user), '验证码已发送，1 分钟内有效');
  }

  @Post('reset-password')
  @HttpCode(200)
  @Auth()
  @ApiOperation({ summary: 'Reset the current account password with a verification code' })
  async resetPassword(
    @CurrentUser() user: AuthUser,
    @Body({ schema: resetPasswordSchema }) body: ResetPasswordInput,
    @Res({ passthrough: true }) response: Response,
  ) {
    return success(await this.auth.resetPassword(user, body, response), '密码已重置，请重新登录');
  }
}
