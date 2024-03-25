import type { DiciLocation } from '~/types';

function parseLocation(locationValue: string): {
  lat: number | null;
  lng: number | null;
  location: DiciLocation | null;
} {

  const emptyResult = {
    lat: null,
    lng: null,
    location: null
  };

  if (!locationValue) {
    return emptyResult;
  }

  let location: DiciLocation | null;

  try {
    location = JSON.parse(locationValue) as DiciLocation;
  } catch (e) {
    return emptyResult;
  }

  const [lat, lng] = location.coords.split(',').map(Number);

  return { lat, lng, location };
}


const Dates = {
  max: (a: Date, b: Date) => a.getTime() > b.getTime() ? a : b,
  min: (a: Date, b: Date) => a.getTime() < b.getTime() ? a : b
};

function processImgField(
  value: string | null | File,
  isUpdate: boolean
): string | null | undefined {
  if ((isUpdate && !value) || value instanceof File) {
    return undefined;
  }
  return value || null;
}

function BadRequest(message: string) {
  return new Response(message, { status: 400 });
}

function Unauthorized(message: string) {
  return new Response(message, { status: 401 });
}

function NotFound(message: string) {
  return new Response(message, { status: 404 });
}

function InternalServerError(message: string) {
  return new Response(message, { status: 500 });
}

export {
  parseLocation,
  processImgField,
  BadRequest,
  Unauthorized,
  NotFound,
  InternalServerError,
  Dates
};
