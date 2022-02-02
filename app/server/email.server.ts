import type { User } from '@prisma/client'
import Config from '~/server/config.server'

const { MAILGUN_DOMAIN, MAILGUN_SENDING_KEY } = Config()

let mailgunDomain: string | undefined = MAILGUN_DOMAIN
if (process.env.NODE_ENV === 'production' && !MAILGUN_DOMAIN) {
  throw new Error('MAILGUN_DOMAIN is required')
}
let mailgunSendingKey: string | undefined = MAILGUN_SENDING_KEY
if (process.env.NODE_ENV === 'production' && !MAILGUN_SENDING_KEY) {
  throw new Error('MAILGUN_SENDING_KEY is required')
}

type MailgunMessage = {
  to: string
  from: string
  subject: string
  text: string
  html?: string | null
}

async function sendEmail({ to, from, subject, text, html }: MailgunMessage) {
  const auth = `${Buffer.from(`api:${mailgunSendingKey}`).toString('base64')}`

  if (html === null) {
    html = text
  }

  // @ts-ignore
  const body = new URLSearchParams({ to, from, subject, text, html })

  if (!MAILGUN_DOMAIN) {
    // eslint-disable-next-line no-console
    console.log(text)
  }

  await fetch(`https://api.mailgun.net/v3/${mailgunDomain}/messages`, {
    method: 'post',
    body,
    headers: {
      Authorization: `Basic ${auth}`
    }
  })
}

async function sendMagicLinkEmail({
  emailAddress,
  magicLink,
  user,
  domainUrl
}: {
  emailAddress: string
  magicLink: string
  user?: User | null
  domainUrl: string
}) {
  const sender = `"DiciSports" <sports@dicisports.com>`
  const { hostname } = new URL(domainUrl)
  const userExists = Boolean(user)

  const text = `
Segue o link para login no ${hostname}:

${magicLink}

${
  userExists
    ? `Welcome back ${emailAddress}!`
    : `
Clicking the link above will create a *new* account on ${hostname} with the email ${emailAddress}. Welcome!
If you'd instead like to change your email address for an existing account, please send an email to team+email-change@dicisports.com from the original email address.
      `.trim()
}

Thanks!

– The KCD Team

P.S. If you did not request this email, you can safely ignore it.
  `.trim()

  const html = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html>
  <head>
    <meta http-equiv='Content-Type' content='text/html charset=UTF-8' />
    <style type='text/css'>
      @font-face {
        font-family: 'Matter';
        src: url('https://kcd-img.netlify.app/Matter-Medium.woff2') format('woff2'),
          url('https://kcd-img.netlify.app/Matter-Medium.woff') format('woff');
        font-weight: 500;
        font-style: normal;
        font-display: swap;
      }

      @font-face {
        font-family: 'Matter';
        src: url('https://kcd-img.netlify.app/Matter-Regular.woff2') format('woff2'),
          url('https://kcd-img.netlify.app/Matter-Regular.woff') format('woff');
        font-weight: normal;
        font-style: normal;
        font-display: swap;
      }
    </style>
  </head>
  <body style='font-family:Matter, sans-serif;'>
    <div style='margin: 0 auto; max-width: 450px;'>

      <h2 style='text-align: center'>${
        user
          ? `Olá ${user.name}! Bem-vindo de volta ao ${hostname}!`
          : `Olá ${emailAddress}! Bem-vindo ao ${hostname}`
      }</h2>
      
      <h3 style='text-align: center'>Clica no botão para fazer login no ${hostname}</h3>

      <a href='${magicLink}' style='display: block; margin: 0 auto; width: 80%; padding: 1.5rem; background: #A6DEE4; border-radius: 7px; border-width: 0; font-size: 1.1rem; text-align: center; font-family: sans-serif; text-decoration: none; color: black'>
        ${userExists ? 'Fazer login' : 'Criar conta'}
      </a>

      <div style='text-align: center; margin-top: 1rem; font-size: .9rem'>
        <div style='color: grey'>O link é válido por 30 minutos</div>
        <a href='${domainUrl}/login' style='margin-top: .4rem; display: block'>Solicitar novo link.</a>
      </div>
        
      <hr style='width: 20%; height: 0px; border: 1px solid lightgrey; margin-top: 2rem; margin-bottom: 2rem'>
        
      <div style='text-align: center; color: grey; font-size: .8rem; line-height: 1.2rem'>
        Recebeu este email porque o seu endereço de email foi usado para fazer login em
        <a href='${domainUrl}' style='color: grey'>${hostname}</a>. Se não solicitou o email,
        ignore sem clickar no link, não correndo qualquer risco de segurança.
      </div>
    </div>
  </body>
</html>
  `

  const message = {
    from: sender,
    to: emailAddress,
    subject: `Link de autenticação para o dicisports.com  ✨`,
    text,
    html
  }

  await sendEmail(message)
}

export { sendEmail, sendMagicLinkEmail }

/*
eslint
  max-statements: "off",
*/
