function parseLocation(location: string) {
  if (!location) {
    return {
      lat: null,
      lng: null,
      address: null
    };
  }
  const [coords, address] = location.split('|');
  const [lat, lng] = coords.split(',');

  return {
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    address
  };
}

function processImgField(
  value: string | null | File,
  isUpdate: boolean
): string | null | undefined {
  if ((isUpdate && !value) || value instanceof File) {
    return undefined;
  }
  return value || null;
}

function Unauthorized(message: string) {
  return new Response(message, { status: 401 });
}

function NotFound(message: string) {
  return new Response(message, { status: 404 });
}

export { parseLocation, processImgField, Unauthorized, NotFound };
