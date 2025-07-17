import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';

import { useTranslation } from 'react-i18next';

import { getBlogPost, getBlogPostContent } from '~/utils/blog.server';
import Main from '~/components/shared/Main';
import BlogPostContent from '~/components/BlogPostContent';
import { getOpenGraphMeta } from '~/utils/seo';

export const handle: { id: string; i18n: string[] } = {
  id: 'blog-post',
  i18n: ['blog']
};

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data?.post) {
    return [
      { title: 'Blog Post Not Found - DiciSports' },
      { name: 'description', content: 'The requested blog post could not be found.' }
    ];
  }

  const { post } = data;
  
  return [
    {
      viewport: 'width=device-width,initial-scale=1,viewport-fit=cover',
      ...getOpenGraphMeta({
        title: `${post.title} - DiciSports Blog`,
        description: post.description,
        keywords: post.keywords.join(', ')
      })
    }
  ];
};

export async function loader({ params }: LoaderFunctionArgs) {
  const { slug } = params;
  
  if (!slug) {
    throw new Response('Not Found', { status: 404 });
  }

  const [post, content] = await Promise.all([
    getBlogPost(slug),
    getBlogPostContent(slug)
  ]);
  
  if (!post || !content) {
    throw new Response('Not Found', { status: 404 });
  }

  return json({ post, content });
}

export default function BlogPost() {
  const { post } = useLoaderData<typeof loader>();
  const { t } = useTranslation('blog');

  return (
    <Main>
      <article className="max-w-4xl mx-auto px-4 py-8">

        <BlogPostContent slug={post.slug} />

        <footer className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <a
              href="/blog"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200"
            >
              ← {t('Back to blog')}
            </a>
            
            {post.keywords.length > 0 && (
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="lowercase">{t('tags')}:</span>
                <div className="flex items-center space-x-1">
                  {post.keywords.map((keyword, index) => (
                    <span key={keyword} className="text-xs">
                      {keyword}
                      {index < post.keywords.length - 1 && ', '}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </footer>
      </article>
    </Main>
  );
}
