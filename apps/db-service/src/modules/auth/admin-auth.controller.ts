import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AdminAuth, CurrentUser } from '@/common/decorators/auth.decorator';
import { RateLimit } from '@/common/decorators/metadata';
import { success } from '@/common/http/api-result';
import { UserAuthQueryService } from '@/infra/permissions/user-auth.query';
import { AuthService } from './auth.service';
import { adminLoginSchema, type AdminLoginInput } from './schemas';

// 单 IP 限制撞库总量
const ADMIN_LOGIN_IP_RATE_LIMIT = { scope: 'auth:admin-login:ip', windowSeconds: 15 * 60, max: 20 };

/**
 * 管理端会话接口，只认 admin 会话；前台会话接口见 PlatformAuthController。
 *
 * 管理端账号是 system_users 里的系统用户，与平台注册用户分表；两端按路径区分会话域而不是按 Cookie 猜：
 * 同一浏览器下两个会话 Cookie 可能同时存在，只看 Cookie 会把另一端的登录态当成当前用户。
 */
@ApiTags('Admin Auth')
@Controller('auth')
export class AdminAuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly userAuthQuery: UserAuthQueryService,
  ) {}

  @Post('login')
  @HttpCode(200)
  @RateLimit(ADMIN_LOGIN_IP_RATE_LIMIT)
  @ApiOperation({ summary: 'System account login for the admin console' })
  async login(
    @Body({ schema: adminLoginSchema }) body: AdminLoginInput,
    @Res({ passthrough: true }) response: Response,
  ) {
    return success(await this.auth.adminLogin(body, response), '登录成功');
  }

  @Get('login-public-key')
  @ApiOperation({ summary: 'Get the RSA public key used to encrypt the login password' })
  loginPublicKey(@Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    return success({ publicKey: this.auth.getLoginPublicKey() }, '登录公钥获取成功');
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Admin console logout' })
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return success(await this.auth.signOut(request, response, 'admin'), '退出登录成功');
  }

  /** 后台权限被收回时 SessionGuard 会作废 admin 会话，这里就拿不到账号 */
  @Get('me')
  @AdminAuth()
  @ApiOperation({ summary: 'Get the current system account, roles and permission codes' })
  async me(@CurrentUser() user: AuthUser) {
    return success(await this.auth.getCurrentSystemAccount(user), '用户信息查询成功');
  }

  @Get('menus')
  @AdminAuth()
  @ApiOperation({ summary: 'Query the permission resource tree of the current system account' })
  async menus(@CurrentUser() user: AuthUser) {
    return success(
      await this.userAuthQuery.queryUserPermissionTree(user.userId),
      '权限资源树查询成功',
    );
  }
}
