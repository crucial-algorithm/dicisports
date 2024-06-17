import type { MetaFunction } from '@remix-run/node';

import PrivacyPolicyPT from '~/markdown/privacy.mdx';
import Main from '~/components/shared/Main';

import { CanonicalMeta } from '~/utils/seo';

export const meta: MetaFunction = CanonicalMeta as MetaFunction;

export default function Privacy() {
  return (
    <Main>
      <article className="prose dark:prose-invert">
        <PrivacyPolicyPT />
      </article>
    </Main>
  );
}
