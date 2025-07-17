import { useLoaderData } from '@remix-run/react';
import ReactMarkdown from 'react-markdown';

interface BlogPostContentProps {
  slug: string;
}

export default function BlogPostContent({ slug }: BlogPostContentProps) {
  const { content } = useLoaderData<{ content: string }>();

  return (
    <div className="prose dark:prose-invert max-w-none">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
