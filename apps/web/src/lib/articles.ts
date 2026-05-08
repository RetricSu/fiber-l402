import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, parse } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export interface ArticleFrontmatter {
  id: string;
  title: string;
  author: string;
  date: string;
  price: number;
  tags: string[];
}

export interface Article {
  id: string;
  title: string;
  author: string;
  date: string;
  price: number;
  preview: string;
  content: string;
  tags: string[];
}

let cache: Map<string, Article> | null = null;

function parseFrontmatter(content: string): { frontmatter: ArticleFrontmatter; body: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
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

  const frontmatter: Partial<ArticleFrontmatter> = {};
  
  for (const line of frontmatterText.split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();
      
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

function generatePreview(body: string, maxLength: number = 200): string {
  let text = body
    .replace(/^#+\s+/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/\*\*|__/g, '')
    .replace(/\*|_/g, '')
    .trim();

  if (text.length <= maxLength) {
    return text;
  }

  const lastSpace = text.lastIndexOf(' ', maxLength);
  return text.slice(0, lastSpace > 0 ? lastSpace : maxLength) + '...';
}

function loadArticleFromFile(filepath: string): Article {
  const content = readFileSync(filepath, 'utf-8');
  const { frontmatter, body } = parseFrontmatter(content);
  const filename = parse(filepath).name;

  return {
    id: frontmatter.id || filename,
    title: frontmatter.title || 'Untitled',
    author: frontmatter.author || 'Unknown',
    date: frontmatter.date || new Date().toISOString().split('T')[0],
    price: frontmatter.price ?? 0.1,
    preview: generatePreview(body),
    content: body,
    tags: frontmatter.tags || [],
  };
}

export function loadAllArticles(): Article[] {
  if (cache) {
    return Array.from(cache.values());
  }

  const articlesDir = join(process.cwd(), 'src/content/articles');
  cache = new Map();

  if (!existsSync(articlesDir)) {
    return [];
  }

  const files = readdirSync(articlesDir).filter(f => 
    f.endsWith('.md') || f.endsWith('.mdx')
  );

  for (const file of files) {
    try {
      const article = loadArticleFromFile(join(articlesDir, file));
      cache.set(article.id, article);
    } catch (error) {
      console.error(`Failed to load article ${file}:`, error);
    }
  }

  return Array.from(cache.values());
}

export function getArticleById(id: string): Article | null {
  const articles = loadAllArticles();
  return cache?.get(id) || null;
}

export function clearArticleCache(): void {
  cache = null;
}
