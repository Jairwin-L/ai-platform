import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionAuth } from '@/common/decorators/auth.decorator';
import { success } from '@/common/http/api-result';
import { presignedRequestSchema, type PresignedRequestInput } from './schemas';
import { UploadService } from './upload.service';

@ApiTags('Upload')
// 通用接口：只挂根路径，platform 经 rewrites 把 /api/upload/* 转发到这里
@Controller('upload')
export class UploadController {
  constructor(private readonly upload: UploadService) {}

  @Post('presigned')
  @HttpCode(200)
  @PermissionAuth('UPLOAD:CREATE')
  @ApiOperation({ summary: 'Generate presigned upload URLs for Cloudflare R2' })
  async presigned(@Body({ schema: presignedRequestSchema }) body: PresignedRequestInput) {
    return success(await this.upload.createPresignedUrls(body), '预签名上传地址生成成功');
  }
}
