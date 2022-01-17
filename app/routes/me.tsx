import ProfileFragment from '~/components/ProfileFragment'
import { useRootData } from '~/utils/use-root-data'
import { ActionFunction, json, LoaderFunction, redirect, useActionData } from 'remix'
import i18n, { SSTranslate } from '~/server/i18n.server'
import { Grid } from '~/components/shared/Grid'
import { Form } from '@remix-run/react'
import Button from '~/components/shared/Button'
import { LogoutIcon } from '@heroicons/react/solid'
import InputError from '~/components/shared/form/InputError'
import { H2, H3, H6 } from '~/components/shared/typography'
import { getSession, requireUser } from '~/server/auth/session.server'
import { handleFormSubmission } from '~/server/actions.server'
import { updateUser } from '~/server/db/users.server'
import { useTranslation } from 'react-i18next'


const actionIds = {
  logout: 'logout',
  changeDetails: 'change details'
}

type ActionData = {
  status: 'success' | 'error'
  fields: {
    name?: string | null
  }
  errors: {
    generalError?: string | null
    name?: string | null
  }
}

function getFirstNameError(firstName: string | null) {
  if (!firstName?.length) return SSTranslate('profile', 'Required Name')
  return null
}

export const loader: LoaderFunction = async ({ request, params }) => {
  await requireUser(request)
  return json({
    i18n: await i18n.getTranslations(request, ['profile'])
  })
}

export const action: ActionFunction = async ({ request }) => {
  const user = await requireUser(request)
  const form = new URLSearchParams(await request.text())
  const actionId = form.get('actionId')
  if (actionId === actionIds.logout) {
    const session = await getSession(request)
    session.signOut()
    const searchParams = new URLSearchParams({
      message: await SSTranslate('profile', 'See you again soon')
    })
    return redirect(`/?${searchParams.toString()}`, {
      headers: await session.getHeaders()
    })
  }

  return await handleFormSubmission<ActionData>({
    form,
    validators: { name: getFirstNameError },
    handleFormValues: async ({ name }) => {
      if (name && user.name !== name) {
        await updateUser(user.id, name)
      }
      const searchParams = new URLSearchParams({
        message: await SSTranslate('profile', 'Profile Saved Successfully')
      })
      return redirect(`/me?${searchParams.toString()}`)
    }
  })
}

export default function Me() {
  const { user } = useRootData()
  const actionData = useActionData<ActionData>()
  const { t } = useTranslation('profile')

  return (
    <main className="mx-10vw">
      <div className="mb-64 mt-24 pt-6">
        <Grid>
          <div className="col-span-full mb-12 lg:mb-20">
            <div className="flex flex-col-reverse items-start justify-between lg:flex-row lg:items-center">
              <div>
                <H2>{t(`Here's your profile`)}</H2>
                <H3 variant="secondary" as="p">
                  {t('Edit as you wish')}
                </H3>
              </div>
              <Form method="post">
                <input type="hidden" name="actionId" value={actionIds.logout} />
                <Button secondary={true}>
                  <LogoutIcon className="w-4 h-4" />
                  <H6 as="span">{t('Logout')}</H6>
                </Button>
              </Form>
            </div>
          </div>
          <InputError id="general-error">
            {actionData?.errors.generalError}
          </InputError>

          <div className="col-span-full mb-24 lg:col-span-5 lg:mb-0">
            <Form method="post" className="w-96">
              <ProfileFragment
                profile={{ name: user?.name, email: user?.email || '' }}
                error={actionData?.errors.name}
              />
              <Button className="mt-8" type="submit" form="profile-form">
                {t('Update Profile')}
              </Button>
            </Form>
          </div>
        </Grid>
      </div>
    </main>
  )
}
