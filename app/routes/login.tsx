import Button from '~/components/Button'
import { Form } from '@remix-run/react'
import TextField from '~/components/TextField'
import FormField from '~/components/shared/form/FormField'
import { ActionFunction, redirect } from 'remix'
import { getLoginInfoSession } from '~/utils/login.server'
import { sendToken } from '~/utils/session.server'
import { verifyEmailAddress } from '~/utils/verifier.server'
import { getDomainUrl, getErrorMessage } from '~/utils/misc'
import { useState } from 'react'
import { SSTranslations } from '~/utils/i18n.server'

function validateEmail(email: string | null): boolean {
  if (!email) return false
  return !!email.match(/.+@.+/)
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

function Logo() {
  return (
    <h1 className="text-6xl text-sp-blue-500 font-extrabold mt-8 mb-8">
      DiciSports
    </h1>
  )
}

function LoginButton({ disabled = false }: { disabled: boolean }) {
  return <Button disabled={disabled}>Email a login link</Button>
}

export default function Login() {
  const [submitted, setSubmitted] = useState(false)
  const [email, setEmail] = useState<string | undefined>()
  const formIsValid = email?.match(/.+@.+/)

  return (
    <div className="flex h-screen">
      <div className="m-auto">
        <div className="flex flex-col items-center justify-center w-full min-w-full w-96">
          <Logo />
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
            <TextField
              name="email"
              label="Email Address"
              className="h-14 text-2xl sm:text-xl"
              defaultValue={email}
              autoComplete="off"
            />
            <FormField>
              <LoginButton disabled={!formIsValid || submitted} />
            </FormField>
          </Form>
        </div>
      </div>
    </div>
  )
}
