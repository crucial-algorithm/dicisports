// import type { MetaFunction } from '@remix-run/node';

import TermsAndConditionsPT from '~/markdown/terms.mdx';
import Main from '~/components/shared/Main';

import { CanonicalMeta } from '~/utils/seo';

export const meta = CanonicalMeta;

export default function Privacy() {
  return (
    <Main>
      <article className="prose dark:prose-invert">
        <TermsAndConditionsPT />
      </article>
    </Main>
  );
}
