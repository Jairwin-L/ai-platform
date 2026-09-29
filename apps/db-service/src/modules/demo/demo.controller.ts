import { Controller, Get, Module } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { success } from '@/common/http/api-result';

/** platform 的 /demo 页面示例接口 */
@ApiTags('Demo')
@Controller('platform/demo')
export class DemoController {
  @Get()
  @ApiOperation({ summary: 'Get demo greeting' })
  greet() {
    return success('Hello', '请求成功');
  }
}

@Module({ controllers: [DemoController] })
export class DemoModule {}
