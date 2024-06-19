import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';

export const loader: LoaderFunction = async () => {
  return json({});
};

export const action: ActionFunction = async () => {
  return json({});
};
