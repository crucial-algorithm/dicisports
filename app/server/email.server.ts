import type { Booking, UICartRow, User } from '~/types';

import Config from '~/server/config.server';

const {
  MAILGUN_ENDPOINT,
  MAILGUN_SENDING_KEY,
  CONVERT_KIT_API_KEY,
  CONVERT_KIT_FORM
} = Config();

const mailgunEndpoint: string = MAILGUN_ENDPOINT;

if (process.env.NODE_ENV === 'production' && !MAILGUN_ENDPOINT) {
  throw new Error('MAILGUN_DOMAIN is required');
}
const mailgunSendingKey: string | undefined = MAILGUN_SENDING_KEY;

if (process.env.NODE_ENV === 'production' && !MAILGUN_SENDING_KEY) {
  throw new Error('MAILGUN_SENDING_KEY is required');
}

type MailgunMessage = {
  to: string;
  from: string;
  subject: string;
  text: string;
  html?: string | null;
};

async function sendEmail({ to, from, subject, text, html }: MailgunMessage) {
  const auth = `${Buffer.from(`api:${mailgunSendingKey}`).toString('base64')}`;

  if (html === null) {
    html = text;
  }

  // @ts-ignore
  const body = new URLSearchParams({ to, from, subject, text, html });

  await fetch(mailgunEndpoint, {
    method: 'post',
    body,
    headers: {
      Authorization: `Basic ${auth}`
    }
  });
}

async function sendMagicLinkEmail({
  emailAddress,
  magicLink,
  user,
  domainUrl
}: {
  emailAddress: string;
  magicLink: string;
  user?: User | null;
  domainUrl: string;
}) {
  const sender = '"DiciSports" <noreply@mail.dicisports.com>';
  const { hostname } = new URL(domainUrl);
  const userExists = Boolean(user);

  const text = `
Segue o link para login no ${hostname}:

${magicLink}

${
  userExists
    ? `Welcome back ${emailAddress}!`
    : `
Ao abrir o link irás criar uma nova conta no ${hostname} com o email ${emailAddress}.
      `.trim()
}

Obrigado!

P.S.  Se não solicitaste o email, ignora sem clickar no link (não incorres em qualquer risco de segurança).
  `.trim();

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
        Recebeste este email porque o teu endereço de email foi usado para fazer login em
        <a href='${domainUrl}' style='color: grey'>${hostname}</a>. Se não solicitaste o email,
        ignora sem clickar no link (não corres qualquer risco de segurança).
      </div>
    </div>
  </body>
</html>
  `;

  const message = {
    from: sender,
    to: emailAddress,
    subject: 'Link de autenticação para o dicisports.com  ✨',
    text,
    html
  };

  await sendEmail(message);
}

async function sendWhatsAppGroupLink({
  emailAddress,
  domainUrl,
  groupName,
  whatsAppLink
}: {
  emailAddress: string;
  domainUrl: string;
  groupName: string;
  whatsAppLink: string;
}) {
  const sender = '"DiciSports" <noreply@mail.dicisports.com>';
  const { hostname } = new URL(domainUrl);

  const text = `
Abre o link no teu telemóvel para te juntares ao group "${groupName}":

${whatsAppLink}

Obrigado!

  `.trim();

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

      <h2 style='text-align: center'>Estás prestes a juntar-te ao grupo <i>${groupName}</i></h2>
      
      <h3 style='text-align: center'>📱No teu telemóvel, clica no botão para te juntares</h3>

      <a href='${whatsAppLink}' style='display: block; margin: 0 auto; width: 80%; padding: 1.5rem; background: #A6DEE4; border-radius: 7px; border-width: 0; font-size: 1.1rem; text-align: center; font-family: sans-serif; text-decoration: none; color: black'>
        Entrar no grupo WhatsApp
      </a>

        
      <hr style='width: 20%; height: 0px; border: 1px solid lightgrey; margin-top: 2rem; margin-bottom: 2rem'>
        
      <div style='text-align: center; color: grey; font-size: .8rem; line-height: 1.2rem'>
        Recebeste este email porque o teu endereço de email foi usado para tentar juntar-te a um grupo no
        <a href='${domainUrl}' style='color: grey'>${hostname}</a>. Se não solicitaste o email,
        ignora sem clickar no link.
      </div>
    </div>
  </body>
</html>
  `;

  const message = {
    from: sender,
    to: emailAddress,
    subject: `Estás prestes a juntar-te ao ${groupName}✨`,
    text,
    html
  };

  await sendEmail(message);
}

async function subscribeUser(email: string, name?: string) {
  if (!CONVERT_KIT_FORM || !CONVERT_KIT_API_KEY) {
    console.log('missing convertkit key && form... bypassing subscription');
    return;
  }

  const payload = {
    api_key: CONVERT_KIT_API_KEY,
    email,
    name
  };

  return fetch(
    `https://api.convertkit.com/v3/forms/${CONVERT_KIT_FORM}/subscribe`,
    {
      method: 'post',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
}

async function sendRecoverPasswordEmail({
  emailAddress,
  magicLink,
  user,
  domainUrl
}: {
  emailAddress: string;
  magicLink: string;
  user: User;
  domainUrl: string;
}) {
  const sender = '"DiciSports" <noreply@mail.dicisports.com>';
  const { hostname } = new URL(domainUrl);

  const text = `
Olá ${user.name},
Segue o link para recuperar a password do ${hostname}:

${magicLink}

Obrigado!

P.S.  Se não solicitaste o email, ignora sem clickar no link (não incorres em qualquer risco de segurança).
  `.trim();

  const html = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html charset=UTF-8" />
    <style type="text/css">
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
  <body style="font-family:Matter, sans-serif;">
    <div style="margin: 0 auto; max-width: 450px;">

      <h2 style="text-align: center">${`Olá ${user.name}!`}</h2>
      
      <h3 style="text-align: center">Clica no botão para fazer recuperar a tua password do ${hostname}</h3>

      <a href="${magicLink}" style="display: block; margin: 0 auto; width: 80%; padding: 1.5rem; background: #A6DEE4; border-radius: 7px; border-width: 0; font-size: 1.1rem; text-align: center; font-family: sans-serif; text-decoration: none; color: black">
        Recuperar password
      </a>

      <div style="text-align: center; margin-top: 1rem; font-size: .9rem">
        <div style="color: grey">O link é válido por 30 minutos</div>
        <a href="${domainUrl}/recover" style="margin-top: .4rem; display: block">Solicitar novo link.</a>
      </div>
        
      <hr style="width: 20%; height: 0px; border: 1px solid lightgrey; margin-top: 2rem; margin-bottom: 2rem">
        
      <div style="text-align: center; color: grey; font-size: .8rem; line-height: 1.2rem">
        Recebeste este email porque o teu endereço de email foi usado para solicitar a recuperação de password em
        <a href="${domainUrl}" style="color: grey">${hostname}</a>. Se não solicitaste o email,
        ignora sem clickar no link (não corres qualquer risco de segurança).
      </div>
    </div>
  </body>
</html>
  `;

  const message = {
    from: sender,
    to: emailAddress,
    subject: 'Link de autenticação para o dicisports.com  ✨',
    text,
    html
  };

  await sendEmail(message);
}

async function sendBookingConfirmationEmail({
  emailAddress,
  event,
  booking,
  domainUrl,
  cart,
  userName
}: {
  emailAddress: string;
  event: any;
  booking: Booking;
  domainUrl: string;
  cart: UICartRow[];
  userName: string | null;
}) {
  const sender = '"DiciSports" <noreply@mail.dicisports.com>';
  const { hostname } = new URL(domainUrl);

  let total = 0;

  cart.map((c) => total += c.price);
  const text = 'TODO';

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
      <h2 style='text-align: center'>
        ${userName && `Olá, ${userName}!`} Obrigado por escolheres a ${hostname} para te inscreveres no evento ${event.name}!
      </h2>
      <h2 style='text-align: center'>
        Aqui tens a informação do teu booking:
      </h2>
      <!-- Beggining cart table -->
      <div style='text-align: center; line-height: 1rem; margin-bottom: 2rem'>
        <h2 style='text-align: center'>
          ID
        </h2>
        <h3 style='text-align: center; color: grey'>
          ${booking.id}
        </h3>
      </div>
      <div style='text-align: center; line-height: 1rem'>
        <h2 style='text-align: center'>
          PIN
        </h2>
        <h3 style='text-align: center; color: grey'>
          ${booking.pin}
        </h3>
      </div>
      <table style="width:100%;table-layout: fixed;border-spacing:0;border-collapse:collapse">
        <tbody>
          <tr>
            <td style="padding:40px 0">
              <center>
                <table style="width:100%;text-align:left;border-spacing:0;border-collapse:collapse;margin:0 auto">
                  <tbody>
                    <tr>
                      <td>
                        <h3 style="font-weight:normal;font-size:20px;margin:0 0 25px">Inscrições</h3>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <table style="width:100%;text-align:left;border-spacing:0;border-collapse:collapse;margin:0 auto">
                  <tbody>
                    <tr>
                      <td>
                        <table style="width:100%;border-spacing:0;border-collapse:collapse" id="races">
                          <tbody>
                            ${cart.map((c) => `
                              <tr style="width: 100%; border-top: 1px solid rgb(229, 229, 229);">
                                <td style="padding-top: 15px;">
                                  <table style="border-spacing: 0px; border-collapse: collapse;">
                                    <tbody>
                                      <tr>
                                        <td style="width: 100%;"><span style="font-size:16px;font-weight:600;line-height:1.4;color:#555">
                                          ${c.name}
                                          </span>
                                          <br>
                                          <span style="font-size:14px;color:#999">Quantidade: ${c.qtd} </span>
                                          <br>
                                        </td>
                                        <td style="white-space: nowrap;">
                                          <p align="right" style="color:#555;line-height:150%;font-size:16px;font-weight:600;margin:0 0 0 15px">
                                            ${c.price}€ 
                                          </p>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                            `).join('')}
                          </tbody>
                        </table>
                        <table style="width:100%;border-spacing:0;border-collapse:collapse;margin-top:15px;border-top-width:1px;border-top-color:#e5e5e5;border-top-style:solid">
                          <tbody>
                            <tr>
                              <td style="width:40%"></td>
                              <td>
                                <table style="width:100%;border-spacing:0;border-collapse:collapse;">
                                  <tbody>
                                    <tr>
                                      <td style="padding:20px 0 0">
                                        <p style="color:#777;line-height:1.2em;font-size:16px;margin:0"><span style="font-size:16px">Total</span>
                                        </p>
                                      </td>
                                      <td align="right" style="padding:20px 0 0"><strong style="font-size:24px;color:#555">${total}€</strong>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </center>
            </td>
          </tr>
        </tbody>
      </table>
      <!-- End cart table -->
      <h3 style='text-align: center; margin-top: 2rem'>
        Clica no botão para acederes ao teu booking
      </h3>
      <a href='${domainUrl}/checkout/confirmation/${event.id}' style='display: block; margin: 0 auto; width: 80%; padding: 1.5rem; background: #A6DEE4; border-radius: 7px; border-width: 0; font-size: 1.1rem; text-align: center; font-family: sans-serif; text-decoration: none; color: black'>
      Aceder ao booking
      </a>
      <hr style='width: 20%; height: 0px; border: 1px solid lightgrey; margin-top: 2rem; margin-bottom: 2rem'>
      <div style='text-align: center; color: grey; font-size: .8rem; line-height: 1.2rem'>
        Recebeste este email porque o teu endereço de email foi usado para fazer login em
        <a href='${domainUrl}' style='color: grey'>${hostname}</a>. Se não solicitaste o email,
        ignora sem clickar no link (não corres qualquer risco de segurança).
      </div>
    </div>
  </body>
</html>
  `;

  const message = {
    from: sender,
    to: emailAddress,
    subject: `Informações do teu booking no evento ${event.name}.`,
    text,
    html
  };

  await sendEmail(message);
}

export {
  sendEmail,
  sendMagicLinkEmail,
  sendWhatsAppGroupLink,
  subscribeUser,
  sendRecoverPasswordEmail,
  sendBookingConfirmationEmail
};

/*
eslint
  max-statements: "off",
*/
