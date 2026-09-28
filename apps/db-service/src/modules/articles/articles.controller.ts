import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionAuth } from '@/common/decorators/auth.decorator';
import { success } from '@/common/http/api-result';
import { ArticlesService } from './articles.service';
import {
  articleIdParam,
  articleQuerySchema,
  createArticleSchema,
  updateArticleSchema,
  type ArticleQuery,
  type CreateArticleInput,
  type UpdateArticleInput,
} from './schemas';

@ApiTags('Articles')
@Controller('platform/articles')
export class ArticlesController {
  constructor(private readonly articles: ArticlesService) {}

  @Get()
  @PermissionAuth('ARTICLES:VIEW')
  @ApiOperation({ summary: 'List articles (cursor pagination)' })
  async list(@Query({ schema: articleQuerySchema }) query: ArticleQuery) {
    return success(await this.articles.list(query), '查询成功');
  }

  @Post()
  @PermissionAuth('ARTICLES:ADD')
  @ApiOperation({ summary: 'Create an article' })
  async create(@Body({ schema: createArticleSchema }) body: CreateArticleInput) {
    return success(await this.articles.create(body), '文章已创建', 201);
  }

  @Get(':id')
  @PermissionAuth('ARTICLES:VIEW')
  @ApiOperation({ summary: 'Get article detail' })
  async findOne(@Param('id', { schema: articleIdParam }) id: string) {
    return success(await this.articles.findOne(id), '查询成功');
  }

  @Put(':id')
  @PermissionAuth('ARTICLES:EDIT')
  @ApiOperation({ summary: 'Update an article' })
  async update(
    @Param('id', { schema: articleIdParam }) id: string,
    @Body({ schema: updateArticleSchema }) body: UpdateArticleInput,
  ) {
    return success(await this.articles.update(id, body), '文章已更新');
  }

  @Delete(':id')
  @PermissionAuth('ARTICLES:DELETE')
  @ApiOperation({ summary: 'Delete an article' })
  async remove(@Param('id', { schema: articleIdParam }) id: string) {
    return success(await this.articles.remove(id), '文章已删除');
  }
}
