function parseLocation(location: string) {
    const [coords, address] = location.split('|');
    const [lat, lng] = coords.split(',');

    return {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        address
    };
}

export {
    parseLocation
}