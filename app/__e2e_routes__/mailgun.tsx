import { writeFileSync, readFileSync } from 'fs';

import type { ActionFunction, LoaderFunction } from 'remix';
import { json } from 'remix';

import type { DataFunctionArgs } from '@remix-run/server-runtime/dist/routeModules';

export const loader: LoaderFunction = async ({ request }: DataFunctionArgs) => {
  const contents = readFileSync('token.txt', 'utf-8');
  const [at, token] = contents.split('|');

  return json({
    url: token
  });
};

export const action: ActionFunction = async ({ request }: DataFunctionArgs) => {
  const params = new URLSearchParams(await request.text());
  const token = extractUrl(params.get('text') as string);
  const at = Date.now();

  writeFileSync('token.txt', `${at}|${token}`);

  return json({});
};

function extractUrl(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  let loginLink = '';

  text.replace(urlRegex, function (url) {
    loginLink = url;
    return url;
  });
  return loginLink;
}
