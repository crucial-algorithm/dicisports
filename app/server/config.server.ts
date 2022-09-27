export type ConfigServer = {
  env: 'development' | 'production'
  inDev: () => boolean
  MAPBOX_TOKEN: string
  CLOUDINARY_UPLOAD_PRESET: string
  CLOUDINARY_CLOUD_NAME: string
  CLOUDINARY_API_KEY: string
  CLOUDINARY_API_SECRET: string
  MAGIC_LINK_SECRET: string
  SESSION_SECRET: string
  SESSION_EXPIRATION_TIME: number
  EMAIL_VERIFIER_TOKEN: string
  MAILGUN_DOMAIN: string | undefined
  MAILGUN_SENDING_KEY: string | undefined
  CONVERT_KIT_FORM: string
  CONVERT_KIT_API_KEY: string
  AWS_REGION: string
  AWS_ACCESS_KEY_ID: string
  AWS_SECRET_ACCESS_KEY: string
  AWS_S3_BUCKET: string
}

let config: ConfigServer | null = null;

export default function Config(): ConfigServer {
  if (config) {return config;}
  const env =
    process.env.NODE_ENV === 'development' ? 'development' : 'production';

  config = {
    env,
    inDev: () => env === 'development',
    MAPBOX_TOKEN: extractVar('MAPBOX_TOKEN'),
    CLOUDINARY_UPLOAD_PRESET: extractVar('CLOUDINARY_UPLOAD_PRESET'),
    CLOUDINARY_CLOUD_NAME: extractVar('CLOUDINARY_CLOUD_NAME'),
    CLOUDINARY_API_KEY: extractVar('CLOUDINARY_API_KEY'),
    CLOUDINARY_API_SECRET: extractVar('CLOUDINARY_API_SECRET'),
    MAGIC_LINK_SECRET: extractVar('MAGIC_LINK_SECRET'),
    SESSION_SECRET: extractVar('SESSION_SECRET'),
    SESSION_EXPIRATION_TIME: 1000 * 60 * 60 * 24 * 365,
    EMAIL_VERIFIER_TOKEN: extractVar('EMAIL_VERIFIER_TOKEN'),
    MAILGUN_DOMAIN: process.env.MAILGUN_DOMAIN,
    MAILGUN_SENDING_KEY: process.env.MAILGUN_SENDING_KEY,

    CONVERT_KIT_FORM: extractVar('CONVERT_KIT_FORM'),
    CONVERT_KIT_API_KEY: extractVar('CONVERT_KIT_API_KEY'),
    AWS_REGION: extractVar('AWS_REGION'),
    AWS_ACCESS_KEY_ID: extractVar('AWS_ACCESS_KEY_ID'),
    AWS_SECRET_ACCESS_KEY: extractVar('AWS_SECRET_ACCESS_KEY'),
    AWS_S3_BUCKET: extractVar('AWS_S3_BUCKET')
  };

  return config;
}

function extractVar(varName: string | undefined): string {
  if (!varName)
    {throw 'reading config for an empty varName... something is wrong';}

  if (!process.env[varName]) {throw `Missing ${varName} in .env`;}

  return process.env[varName] as string;
}
