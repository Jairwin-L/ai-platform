import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Response } from 'express';
import { Observable, map } from 'rxjs';
import { ApiResult } from '../http/api-result';

/**
 * 把控制器返回的 ApiResult 组装成统一响应体，并把业务 code 同步为 HTTP 状态码。
 *
 * 返回值不是 ApiResult 时（二进制、SSE、显式使用 @Res() 的路由）原样透传，不做任何包装。
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((value) => {
        if (!(value instanceof ApiResult)) return value;

        response.status(value.code);
        const body: ApiSuccessResponse<unknown> = {
          code: value.code,
          success: true,
          message: value.message,
          data: value.data,
          timestamp: Date.now(),
        };
        return body;
      }),
    );
  }
}
