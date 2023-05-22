import type { LoaderFunction, MetaFunction } from '@remix-run/node';

import Main from '~/components/shared/Main';

import { CanonicalMeta } from '~/utils/seo';
import { requireAdminUser } from '~/server/auth/session.server';

export const meta: MetaFunction = CanonicalMeta;

export const loader: LoaderFunction = async ({ request }) => {
  await requireAdminUser(request);
};

export default function Privacy() {
  return (
    <Main>
      <article className="prose dark:prose-invert">
        {/* TODO: add dici terms and conditions */}
      </article>
    </Main>
  );
}
