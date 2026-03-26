import type { Request } from 'express';
import type { Article, ProtectedResourceInfo, ResourceResolver } from '@fiber-l402/sdk';
import type { ArticleService } from '../../services/article.js';

type ArticleLookupService = Pick<ArticleService, 'getById'>;

export class ArticleContentResolver implements ResourceResolver {
  name = 'article-content';
  private articleService: ArticleLookupService;

  constructor(articleService: ArticleLookupService) {
    this.articleService = articleService;
  }

  matches(req: Request): boolean {
    const path = req.path || '';
    return req.method === 'GET' && path.startsWith('/api/articles/') && path.endsWith('/content');
  }

  async resolve(req: Request): Promise<ProtectedResourceInfo | undefined> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
      return undefined;
    }

    const article = await this.articleService.getById(id) as Article | null;
    if (!article) {
      return undefined;
    }

    return {
      id: article.id,
      type: 'article',
      priceCkb: article.price,
    };
  }
}
