import { Injectable, StandardSchemaValidationPipe } from '@nestjs/common';
import type { ArgumentMetadata } from '@nestjs/common';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { COMMON_ERROR } from '@ai/constants/error-codes';
import { ApiException } from '@/common/http/api-exception';
import { formatSchemaIssues } from '@/common/utils/validation';

/**
 * 把 issues 从内置管道里带出来的内部载体。
 *
 * 内置管道的 exceptionFactory 只拿得到 issues，拿不到 ArgumentMetadata，而请求体和
 * 查询参数要落到不同的错误码上；不能用实例字段暂存 metadata——全局管道是单例，并发请求会互相覆盖。
 */
class SchemaIssuesError extends Error {
  constructor(readonly issues: readonly StandardSchemaV1.Issue[]) {
    super('Schema validation failed');
  }
}

/**
 * Standard Schema 校验管道。
 *
 * 只处理参数装饰器上带 `schema` 的路由，其余参数原样透传，因此可以安全地挂成全局管道。
 * 请求体校验失败是 VALIDATION_ERROR，查询参数与路由参数是 PARAM_ERROR，都返回 400；
 * issues 放进 errorDetail，BYOK / AI 接口的异常过滤器据此取第一条文案。
 */
@Injectable()
export class AppStandardSchemaValidationPipe extends StandardSchemaValidationPipe {
  constructor() {
    super({ exceptionFactory: (issues) => new SchemaIssuesError(issues) });
  }

  override async transform<T = unknown>(value: T, metadata: ArgumentMetadata): Promise<T> {
    try {
      return await super.transform(value, metadata);
    } catch (error) {
      if (!(error instanceof SchemaIssuesError)) throw error;

      const errorType =
        metadata.type === 'body' ? COMMON_ERROR.VALIDATION_ERROR : COMMON_ERROR.PARAM_ERROR;
      throw new ApiException(errorType, formatSchemaIssues(error.issues), error.issues, 400);
    }
  }
}
