export type ConfigServer = {
  env: 'development' | 'production';
  inDev: () => boolean;
  MAPBOX_TOKEN: string;
  CLOUDINARY_UPLOAD_PRESET: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  MAGIC_LINK_SECRET: string;
  SESSION_SECRET: string;
  SESSION_EXPIRATION_TIME: number;
  EMAIL_VERIFIER_TOKEN: string;
  MAILGUN_DOMAIN: string | undefined;
  MAILGUN_ENDPOINT: string;
  MAILGUN_SENDING_KEY: string | undefined;
  CONVERT_KIT_FORM: string;
  CONVERT_KIT_API_KEY: string;
  AWS_REGION: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_S3_BUCKET: string;
  RELEASE: string;
  SIBS_CHECKOUT_FORM_SCRIPT: string;
  SIBS_API_TOKEN: string;
  SIBS_URL_ENDPOINT: string;
  SIBS_TERMINAL_ID: number;
  SIBS_CLIENT_ID: string;
  SIBS_WEBHOOK_SECRET: string;
  SIBS_MULTIBANCO_ENTITIY: string;
  SIBS_MULTIBANCO_EXPIRATION_DAYS: number;
  SIBS_CHECK_STATUS_ENDPOINT: string;
  DEFAULT_COMMISSION: number;
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
    MAILGUN_ENDPOINT: extractVar('MAILGUN_ENDPOINT'),
    MAILGUN_SENDING_KEY: process.env.MAILGUN_SENDING_KEY,

    CONVERT_KIT_FORM: extractVar('CONVERT_KIT_FORM'),
    CONVERT_KIT_API_KEY: extractVar('CONVERT_KIT_API_KEY'),
    AWS_REGION: extractVar('AWS_REGION'),
    AWS_ACCESS_KEY_ID: extractVar('AWS_ACCESS_KEY_ID'),
    AWS_SECRET_ACCESS_KEY: extractVar('AWS_SECRET_ACCESS_KEY'),
    AWS_S3_BUCKET: extractVar('AWS_S3_BUCKET'),
    RELEASE: extractVar('RELEASE'),
    SIBS_CHECKOUT_FORM_SCRIPT: extractVar('SIBS_CHECKOUT_FORM_SCRIPT'),
    SIBS_URL_ENDPOINT: extractVar('SIBS_URL_ENDPOINT'),
    SIBS_API_TOKEN: extractVar('SIBS_API_TOKEN'),
    SIBS_TERMINAL_ID: Number(extractVar('SIBS_TERMINAL_ID')),
    SIBS_CLIENT_ID: extractVar('SIBS_CLIENT_ID'),
    SIBS_WEBHOOK_SECRET: extractVar('SIBS_WEBHOOK_SECRET'),
    SIBS_MULTIBANCO_ENTITIY: extractVar('SIBS_MULTIBANCO_ENTITIY'),
    SIBS_MULTIBANCO_EXPIRATION_DAYS: Number(extractVar('SIBS_MULTIBANCO_EXPIRATION_DAYS')),
    SIBS_CHECK_STATUS_ENDPOINT: extractVar('SIBS_CHECK_STATUS_ENDPOINT'),
    DEFAULT_COMMISSION: Number(extractVar('DEFAULT_COMMISSION'))
  };

  return config;
}

function extractVar(varName: string | undefined): string {
  if (!varName) {
    throw 'reading config for an empty varName... something is wrong';
  }

  if (!process.env[varName]) {throw `Missing ${varName} in .env`;}

  return process.env[varName] as string;
}
