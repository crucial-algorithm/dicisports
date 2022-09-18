function parseLocation(location: string) {
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
    if (isUpdate && !value || value instanceof File) {
        return undefined;
    }
    return value || null;
}

export {
    parseLocation,
    processImgField
}