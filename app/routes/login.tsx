import Button from '~/components/shared/Button'
import { Form, useLoaderData } from '@remix-run/react'
import TextField from '~/components/shared/form/TextField'
import FormField from '~/components/shared/form/FormField'
import { ActionFunction, json, LoaderFunction, redirect } from 'remix'
import { getLoginInfoSession } from '~/server/auth/login.server'
import { getUser, sendToken } from '~/server/auth/session.server'
import { verifyEmailAddress } from '~/server/auth/verifier.server'
import { getDomainUrl, getErrorMessage } from '~/utils/misc'
import { useState } from 'react'
import i18n, { SSTranslations } from '~/server/i18n.server'
import InputError from '~/components/shared/form/InputError'
import { useTranslation } from 'react-i18next'
import Logo from '~/components/Logo'

function validateEmail(email: string | null): boolean {
  if (!email) return false
  return !!email.match(/.+@.+/)
}

type LoaderData = {
  email?: string
  error?: string
}

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUser(request)
  if (user) return redirect('/me')

  const loginSession = await getLoginInfoSession(request)

  const data: LoaderData = {
    email: loginSession.getEmail(),
    error: loginSession.getError()
  }

  const headers = new Headers({
    'Cache-Control': 'private, max-age=3600',
    Vary: 'Cookie'
  })
  await loginSession.getHeaders(headers)

  return json(
    {
      ...data,
      i18n: await i18n.getTranslations(request, ['profile'])
    },
    { headers }
  )
}

export const action: ActionFunction = async ({ request }) => {
  const params = new URLSearchParams(await request.text())
  const loginSession = await getLoginInfoSession(request)
  const emailAddress = params.get('email')
  // always loading errors!?!?
  const t = await SSTranslations('profile')

  if (emailAddress) loginSession.setEmail(emailAddress)

  if (!emailAddress || !validateEmail(emailAddress)) {
    loginSession.flashError(t('Invalid Email'))
    return redirect(`/login`, {
      status: 400,
      headers: await loginSession.getHeaders()
    })
  }

  try {
    const verifierResult = await verifyEmailAddress(emailAddress)
    if (!verifierResult.status) {
      const errorMessage = t('Email Error', {
        error: verifierResult.error.message
      })
      loginSession.flashError(errorMessage)
      return redirect(`/login`, {
        status: 400,
        headers: await loginSession.getHeaders()
      })
    }
  } catch (error: unknown) {
    console.error(`There was an error verifying an email address:`, error)
    // continue on... This was probably our fault...
    // IDEA: notify me of this issue...
  }

  try {
    const domainUrl = getDomainUrl(request)
    const magicLink = await sendToken({ emailAddress, domainUrl })
    loginSession.setMagicLink(magicLink)
    return redirect(`/login`, {
      headers: await loginSession.getHeaders()
    })
  } catch (e: unknown) {
    loginSession.flashError(t(getErrorMessage(e)))
    return redirect(`/login`, {
      status: 400,
      headers: await loginSession.getHeaders()
    })
  }
}

function LoginButton({
  disabled = false,
  label
}: {
  disabled: boolean
  label: string
}) {
  return <Button disabled={disabled}>{label}</Button>
}

export default function Login() {
  const data = useLoaderData<LoaderData>()
  const [submitted, setSubmitted] = useState(false)
  const [email, setEmail] = useState<string | undefined>()
  const formIsValid = email?.match(/.+@.+/)
  const { t } = useTranslation('profile')

  return (
    <div className="flex">
      <div className="m-auto mt-64">
        <div className="flex flex-col items-center justify-center w-full min-w-full w-96">
          <Logo xxl={true} className="mb-8" />
          <Form
            autoComplete="off"
            className="w-full"
            method="post"
            action="/login"
            onChange={(event) => {
              const form = event.currentTarget
              setEmail(form.email.value)
            }}
            onSubmit={() => setSubmitted(true)}
          >
            <FormField label={t('Email')}>
              <TextField
                name="email"
                className="h-14 text-2xl sm:text-xl"
                defaultValue={email}
                autoComplete="off"
              />
            </FormField>
            <LoginButton
              disabled={!formIsValid || submitted}
              label={t('Email a login link')}
            />
            {data.error ? (
              <InputError id="error-message">{data.error}</InputError>
            ) : data.email ? (
              <p
                id="success-message"
                className="dark:text-blueGray-500 text-gray-500 text-lg mt-2"
              >
                <span role="img" aria-label="sparkles">
                  ✨
                </span>{' '}
                {t('A magic link has been sent to you')}
              </p>
            ) : null}
          </Form>
        </div>
      </div>
    </div>
  )
}
