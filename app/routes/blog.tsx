import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { useTranslation } from 'react-i18next';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';

import { getBlogPosts } from '~/utils/blog.server';
import Main from '~/components/shared/Main';
import { getOpenGraphMeta } from '~/utils/seo';
import DisplayDate from '~/components/shared/DIsplayDate';

export const handle: { id: string; i18n: string[] } = {
  id: 'blog',
  i18n: ['blog']
};

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const posts = data?.posts || [];
  const keywords = Array.from(new Set(posts.flatMap((post) => post.keywords))).join(', ');
  
  return [
    {
      viewport: 'width=device-width,initial-scale=1,viewport-fit=cover',
      ...getOpenGraphMeta({
        title: 'DiciSports - Blog',
        description: 'Read our latest blog posts about web development, sports, and technology.',
        keywords
      })
    }
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const posts = await getBlogPosts();
  
  return json({
    posts
  });
}

export default function Blog() {
  const { posts } = useLoaderData<typeof loader>();
  const { t } = useTranslation('blog');

  return (
    <Main>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
          {t('blog title')}
        </h1>
        
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-6">
            {t('posts')}
          </h3>
          
          <ul className="space-y-4">
            {posts.map((post) => (
              <li key={post.slug}>
                <a
                  href={`/blog/${post.slug}`}
                  className="block group hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg p-4 transition-colors duration-200"
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors duration-200">
                        {post.title}
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm leading-relaxed">
                        {post.description}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-500">
                        <time dateTime={post.date} className="capitalize">
                          <DisplayDate date={post.date} />
                        </time>
                        {post.categories.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <span>•</span>
                            <span>{post.categories.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </a>
              </li>
            ))}
          </ul>
          
          {posts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                {t('No blog posts found.')}
              </p>
            </div>
          )}
        </div>
      </div>
    </Main>
  );
}
