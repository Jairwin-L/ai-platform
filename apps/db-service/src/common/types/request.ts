import type { Request } from 'express';

/** 经过鉴权守卫后的请求：守卫把当前登录用户注入到 user */
export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}
