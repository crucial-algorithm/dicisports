import PrivacyPolicyPT from '~/markdown/privacy.md'
import Main from '~/components/shared/Main'

export default function Privacy() {
  return (
    <Main>
      <article className="prose dark:prose-invert">
        {/* @ts-ignore */}
        <PrivacyPolicyPT />
      </article>
    </Main>
  )
}
