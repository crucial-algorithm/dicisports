import type { MetaFunction } from '@remix-run/node';

import OrganizerTermsPT from '~/markdown/organizers-terms.md';
import Main from '~/components/shared/Main';

import { CanonicalMeta } from '~/utils/seo';

// TODO [MIGRATE TO V2]: reinstate Meta Function
// export const meta: MetaFunction = CanonicalMeta;

export default function Privacy() {
  return (
    <Main>
      <article className="prose dark:prose-invert">
        <OrganizerTermsPT />
      </article>
    </Main>
  );
}
