/* oxlint-disable triple-slash-reference */
/**
 * @file @ai/types 的聚合入口。
 *       这些声明是与应用解耦的全局 ambient 类型，正常由各项目 tsconfig 的 include 直接引入，
 *       此文件仅为让包具备可解析的 types 字段。
 *       依赖应用内部模块（`@/lib`、Prisma Client 等）或第三方模块类型的声明保留在
 *       apps/platform/src/typings/。
 */
/// <reference path="./src/app/api/upload.d.ts" />
/// <reference path="./src/app/forms.d.ts" />
/// <reference path="./src/http/admin.d.ts" />
/// <reference path="./src/http/ai-chat.d.ts" />
/// <reference path="./src/http/ai-credentials.d.ts" />
/// <reference path="./src/http/alova.d.ts" />
/// <reference path="./src/http/articles.d.ts" />
/// <reference path="./src/http/auth.d.ts" />
/// <reference path="./src/http/common.d.ts" />
/// <reference path="./src/http/third-party-service-credentials.d.ts" />
/// <reference path="./src/http/users.d.ts" />
/// <reference path="./src/lib/third-party-service-options.d.ts" />
/// <reference path="./src/stores.d.ts" />
/// <reference path="./src/utils.d.ts" />
