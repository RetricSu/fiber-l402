import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, parse } from 'path';
import { fileURLToPath } from 'url';
import type { Article } from '../types/article.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export interface ArticleFrontmatter {
  id: string;
  title: string;
  author: string;
  date: string;
  price: number;
  tags: string[];
}

export class ArticleService {
  private articlesDir: string;
  private cache: Map<string, Article>;
  private cacheInitialized: boolean;

  constructor(articlesDir?: string) {
    this.articlesDir = articlesDir || join(__dirname, '../../content/articles');
    this.cache = new Map();
    this.cacheInitialized = false;
  }

  async loadAll(): Promise<Article[]> {
    if (this.cacheInitialized) {
      return Array.from(this.cache.values());
    }

    if (!existsSync(this.articlesDir)) {
      return [];
    }

    const files = readdirSync(this.articlesDir).filter(f => 
      f.endsWith('.md') || f.endsWith('.mdx')
    );

    for (const file of files) {
      try {
        const article = this.loadArticleFromFile(file);
        this.cache.set(article.id, article);
      } catch (error) {
        console.error(`Failed to load article ${file}:`, error);
      }
    }

    this.cacheInitialized = true;
    return Array.from(this.cache.values());
  }

  async getById(id: string): Promise<Article | null> {
    if (!this.cacheInitialized) {
      await this.loadAll();
    }
    return this.cache.get(id) || null;
  }

  getPreview(id: string): Promise<Article | null> {
    return this.getById(id);
  }

  async getFullContent(id: string): Promise<string | null> {
    const article = await this.getById(id);
    return article?.content || null;
  }

  private loadArticleFromFile(filename: string): Article {
    const filepath = join(this.articlesDir, filename);
    const content = readFileSync(filepath, 'utf-8');
    
    const { frontmatter, body } = this.parseFrontmatter(content);
    
    // Generate preview (first ~200 chars of body after frontmatter)
    const preview = this.generatePreview(body);

    return {
      id: frontmatter.id || parse(filename).name,
      title: frontmatter.title || 'Untitled',
      author: frontmatter.author || 'Unknown',
      date: frontmatter.date || new Date().toISOString().split('T')[0],
      price: frontmatter.price ?? 0.1,
      preview,
      content: body,
      tags: frontmatter.tags || [],
    };
  }

  private parseFrontmatter(content: string): { frontmatter: ArticleFrontmatter; body: string } {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      // No frontmatter, treat entire content as body
      return {
        frontmatter: {
          id: '',
          title: '',
          author: '',
          date: '',
          price: 0.1,
          tags: [],
        },
        body: content,
      };
    }

    const frontmatterText = match[1];
    const body = match[2].trim();

    // Simple YAML-like parsing for frontmatter
    const frontmatter: Partial<ArticleFrontmatter> = {};
    
    for (const line of frontmatterText.split('\n')) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        let value = line.slice(colonIndex + 1).trim();
        
        // Handle arrays like tags: ["test", "sample"]
        if (value.startsWith('[') && value.endsWith(']')) {
          value = value.slice(1, -1);
          (frontmatter as Record<string, unknown>)[key] = value.split(',').map(v => 
            v.trim().replace(/^["']|["']$/g, '')
          );
        } else if (key === 'price') {
          const parsedPrice = Number(value);
          (frontmatter as Record<string, unknown>)[key] = Number.isFinite(parsedPrice)
            ? parsedPrice
            : 0.1;
        } else {
          (frontmatter as Record<string, unknown>)[key] = value.replace(/^["']|["']$/g, '');
        }
      }
    }

    return {
      frontmatter: {
        id: frontmatter.id || '',
        title: frontmatter.title || '',
        author: frontmatter.author || '',
        date: frontmatter.date || '',
        price: frontmatter.price ?? 0.1,
        tags: frontmatter.tags || [],
      },
      body,
    };
  }

  private generatePreview(body: string, maxLength: number = 200): string {
    // Remove markdown headings and code blocks for preview
    let text = body
      .replace(/^#+\s+/gm, '') // Remove headings
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove links, keep text
      .replace(/\*\*|__/g, '') // Remove bold
      .replace(/\*|_/g, '') // Remove italic
      .trim();

    if (text.length <= maxLength) {
      return text;
    }

    // Find last space before maxLength
    const lastSpace = text.lastIndexOf(' ', maxLength);
    return text.slice(0, lastSpace > 0 ? lastSpace : maxLength) + '...';
  }
}
