// Required locally to run `npm run start` after `npm run build`;
// This is also the method used in GHA
import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';

export const loader: LoaderFunction = async () => {
  return json({});
};

export const action: ActionFunction = async () => {
  return json({});
};
