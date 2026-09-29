import { Module } from '@nestjs/common';
import { CompressController } from '@/modules/compress/compress.controller';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

/** 上传与压缩：只有前台登录用户使用，挂在根路径的通用接口 */
@Module({
  controllers: [UploadController, CompressController],
  providers: [UploadService],
})
export class UploadModule {}
