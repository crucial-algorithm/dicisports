import Profile from '~/components/Profile'
import { useRootData } from '~/utils/use-root-data'
import { json, LoaderFunction } from 'remix'
import i18n from '~/server/i18n.server'

export const loader: LoaderFunction = async ({ request, params }) => {
  return json({
    i18n: await i18n.getTranslations(request, ['profile'])
  })
}

export default function Me() {
  const { user } = useRootData()
  return (
    <Profile
      profile={{ name: user?.name, email: user?.email || '' }}
      postUrl="/signup"
    />
  )
}
