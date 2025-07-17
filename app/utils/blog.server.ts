import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

import type { ComponentType } from 'react';

import matter from 'gray-matter';

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  categories: string[];
  keywords: string[];
  component?: ComponentType;
}

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  categories: string[];
  keywords: string[];
}

const BLOG_CONTENT_PATH = join(process.cwd(), 'content', 'blog');

export async function getBlogPosts(): Promise<BlogPostMeta[]> {
  try {
    const files = await readdir(BLOG_CONTENT_PATH);
    const mdxFiles = files.filter(file => file.endsWith('.mdx'));
    
    const posts = await Promise.all(
      mdxFiles.map(async (file) => {
        const filePath = join(BLOG_CONTENT_PATH, file);
        const fileContent = await readFile(filePath, 'utf-8');
        const { data } = matter(fileContent);
        
        return {
          slug: file.replace('.mdx', ''),
          title: data.title || '',
          description: data.description || '',
          date: data.date || '',
          categories: data.categories || [],
          keywords: data.keywords || []
        } as BlogPostMeta;
      })
    );
    
    // Sort posts by date (newest first)
    return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error('Error reading blog posts:', error);
    return [];
  }
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    const filePath = join(BLOG_CONTENT_PATH, `${slug}.mdx`);
    const fileContent = await readFile(filePath, 'utf-8');
    const { data } = matter(fileContent);
    
    return {
      slug,
      title: data.title || '',
      description: data.description || '',
      date: data.date || '',
      categories: data.categories || [],
      keywords: data.keywords || []
    };
  } catch (error) {
    console.error(`Error reading blog post ${slug}:`, error);
    return null;
  }
}

export async function getBlogPostContent(slug: string): Promise<string | null> {
  try {
    const filePath = join(BLOG_CONTENT_PATH, `${slug}.mdx`);
    const fileContent = await readFile(filePath, 'utf-8');
    const { content } = matter(fileContent);
    
    return content;
  } catch (error) {
    console.error(`Error reading blog post content ${slug}:`, error);
    return null;
  }
}
