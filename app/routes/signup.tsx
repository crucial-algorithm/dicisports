import { Form, useLoaderData } from '@remix-run/react'
import { ActionFunction, LoaderFunction, redirect } from 'remix'
import {
  getSession,
  getUser,
  validateMagicLink
} from '~/server/auth/session.server'
import { getLoginInfoSession } from '~/server/auth/login.server'
import { getErrorStack } from '~/utils/misc'
import { handleFormSubmission } from '~/server/actions.server'
import { MemberProfile } from '~/types'
import ProfileFragment from '~/components/ProfileFragment'
import { SSError, SSTranslate } from '~/server/i18n.server'
import { createUser, findUserByEmail } from '~/server/db/users.server'
import Button from '~/components/shared/Button'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import ButtonGroup from '~/components/shared/ButtonGroup'
import CAGResponse from '~/server/response.server'

type ActionData = {
  status: 'success' | 'error'
  fields: {
    name: string | null
  }
  errors: {
    generalError?: string
    name: string | null
  }
}

function getErrorForName(name: string | null) {
  if (!name) return `Name is required`
  if (name.length > 60) return `Name is too long`
  return null
}

export const action: ActionFunction = async ({ request }) => {
  const loginInfoSession = await getLoginInfoSession(request)

  const requestText = await request.text()
  const form = new URLSearchParams(requestText)
  if (form.get('actionId') === actionIds.cancel) {
    loginInfoSession.clean()
    return redirect('/', {
      headers: await loginInfoSession.getHeaders()
    })
  }

  const session = await getSession(request)
  const magicLink = loginInfoSession.getMagicLink()
  let email: string
  try {
    email = await validateMagicLink(magicLink, loginInfoSession.getMagicLink())
  } catch (error: unknown) {
    console.error(getErrorStack(error))

    loginInfoSession.clean()
    loginInfoSession.flashError(
      await SSError('>>Error<<: Sign in link invalid. Please request a new one')
    )
    return redirect('/login', {
      headers: await loginInfoSession.getHeaders()
    })
  }

  return handleFormSubmission<ActionData>({
    form,
    validators: {
      name: getErrorForName
    },
    handleFormValues: async (formData) => {
      const { name } = formData

      try {
        const user = await createUser({ email, name })

        const headers = new Headers()
        await session.signIn(user)
        await session.getHeaders(headers)
        // IDEA: try using destroy... Didn't seem to work last time I tried though.
        loginInfoSession.clean()
        await loginInfoSession.getHeaders(headers)
        return redirect('/me', { headers })
      } catch (error: unknown) {
        console.error(getErrorStack(error))

        loginInfoSession.flashError(
          await SSTranslate('profile', 'Problem Creating Account')
        )
        return redirect('/login', {
          headers: await loginInfoSession.getHeaders()
        })
      }
    }
  })
}

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUser(request)
  if (user) return redirect('/me')

  const loginInfoSession = await getLoginInfoSession(request)
  const magicLink = loginInfoSession.getMagicLink()
  const email = loginInfoSession.getEmail()
  if (!magicLink || !email) {
    loginInfoSession.clean()
    loginInfoSession.flashError(await SSError('>>Error<<: Invalid magic link'))
    return redirect('/login', {
      headers: await loginInfoSession.getHeaders()
    })
  }

  const userForMagicLink = await findUserByEmail(email)

  if (userForMagicLink) {
    // user exists, but they haven't clicked their magic link yet
    // we don't want to tell them that a user exists with that email though
    // so we'll invalidate the magic link and force them to try again.
    loginInfoSession.clean()
    loginInfoSession.flashError(await SSError('>>Error<<: Invalid magic link'))
    return redirect('/login', {
      headers: await loginInfoSession.getHeaders()
    })
  }

  const headers = await loginInfoSession.getHeaders()
  return CAGResponse(request, { email }, headers)
}

const actionIds = {
  cancel: 'cancel',
  signUp: 'sign up'
}

export default function SignUp() {
  const data = useLoaderData<MemberProfile>()
  const [action, setAction] = useState<string>('submit')
  const { t } = useTranslation('signup')
  return (
    <main className="mx-10vw flex">
      <div className="m-auto">
        <Form method="post" className="w-96">
          <ProfileFragment
            profile={data}
            labelEmail={t('Email')}
            labelName={t('Name')}
          />
          <ButtonGroup>
            <Button
              className="mr-2"
              variant="secondary"
              onClick={() => setAction('cancel')}
            >
              {t('Cancel')}
            </Button>
            <Button>{t('Create Profile')}</Button>
          </ButtonGroup>
          <input type="hidden" name="actionId" value={action} />
        </Form>
      </div>
    </main>
  )
}
