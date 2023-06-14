import clsx from 'clsx';
import * as React from 'react';
import { useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import { MapPinIcon } from '@heroicons/react/24/solid';

import { useTranslation } from 'react-i18next';

import Dialog from '~/components/shared/Dialog';
import Button from '~/components/shared/Button';
import type { DiciLocation } from '~/types';

type MapInfo = {
  lat: number
  lng: number
  zoom: number
  address: string | null
}

type MapBoxFeature = {
  text: string
  place_name: string
  context: Array<{ id: string; wikidata?: string; text: string }>
}

const MAP_BOX_URL = 'api.mapbox.com/geocoding/v5/mapbox.places';
const MAP_STYLE = 'mapbox://styles/mapbox/streets-v11';
const types = [
  'address',
  'country',
  'region',
  'postcode',
  'district',
  'place',
  'locality'
];

type MapProps = {
  token: string
  callback: (location: DiciLocation | null) => void
  placeholder: string
  defaultValue?: DiciLocation | null
} & Omit<React.ComponentProps<'div'>, 'defaultValue'>

function Map({
  token,
  callback,
  placeholder,
  defaultValue,
  className
}: MapProps) {
  const coords = !defaultValue
    ? [40.211945184369455, -8.432174917415097]
    : defaultValue.coords.split(',').map((p) => parseFloat(p));
  const [, setMap] = React.useState<mapboxgl.Map>();
  const [info, setInfo] = React.useState<MapInfo>({
    lat: coords[0],
    lng: coords[1],
    zoom: 15,
    address: placeholder
  });

  const mapNode = React.useRef(null);

  React.useEffect(() => {
    const node = mapNode.current;

    if (typeof window === 'undefined' || node === null) {
      return;
    }

    // otherwise, create a map instance
    const map = new mapboxgl.Map({
      container: node,
      accessToken: token,
      style: MAP_STYLE,
      center: [info.lng, info.lat],
      zoom: info.zoom,
      boxZoom: true
    });

    // Add the control to the map.
    map.addControl(
      new MapboxGeocoder({

        accessToken: token,
        zoom: 15,
        mapboxgl,
        reverseGeocode: false
      }), 'top-left'
    );

    // add the button to "center in current location"
    map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
      }), 'top-left'
    );

    // save the map object to React.useState
    setMap(map);

    map.on('moveend', () => {
      const center = map.getCenter();

      getAddress(center.lat, center.lng).then((location) => {
        setInfo({
          lat: center.lat,
          lng: center.lng,
          zoom: map.getZoom(),
          address: capitalize(location?.shortAddress || '')
        });
        callback(location);
      });
    });

    map.on('load', () => {});

    const getAddress = async (
      lat: number,
      lng: number
    ): Promise<DiciLocation | null> => {
      const location = [lng, lat].join(',');
      const url = `https://${MAP_BOX_URL}/${location}.json?limit=1&types=${types.join(
        '%2C'
      )}&access_token=${token}`;
      const res = await fetch(url);
      const json = await res.json();
      const feature = json.features[0] || null;

      if (!feature) {
        return null;
      }
      return processMapBoxFeature(feature, lat, lng);
    };

    return () => {
      map.remove();
    };
  }, []);

  return (
    <div className={clsx('relative left-0 w-full overflow-hidden h-full')}>
      <Label label={info.address} />
      <Pin />
      <div ref={mapNode} className="h-full"/>
    </div>
  );
}

function Pin() {
  return (
    <div className="z-10 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      <MapPinIcon className="text-black w-6 h-6" />
    </div>
  );
}

function Label({ label }: { label: string | null }) {
  return label ? (
    <div className="z-10 absolute left-1/2 [top:calc(50%-32px)] -translate-x-1/2 -translate-y-1/2 bg-black text-white text-xs font-semibold py-1 px-2.5 rounded-[50px]">
      {label}
    </div>
  ) : null;
}

/**
 * Use capitalize implementation so that default label (hint) is not
 * capitalized through the CSS
 * @param str
 */
function capitalize(str: string) {
  if (!str) {return str;}
  return str
    .split(/\s/)
    .map((s) => (s.length > 0 ? (s[0] + '').toUpperCase() + s.slice(1) : ''))
    .join(' ');
}

function processMapBoxFeature(
  feature: MapBoxFeature,
  lat: number,
  lng: number
): DiciLocation | null {
  const { text, place_name, context } = feature;
  const output: DiciLocation = {
    coords: `${lat},${lng}`,
    shortAddress: text,
    address: place_name,
    postcode: null,
    place: null,
    region: null,
    country: null
  };

  for (const ctx of context) {
    const { id, text } = ctx;
    const key = id.split('.')[0];

    switch (key) {
      case 'postcode':
        output.postcode = text;
        break;
      case 'place':
        output.place = text;
        break;
      case 'region':
        output.region = text;
        break;
      case 'country':
        output.country = text;
        break;
    }
  }
  return output;
}

export type MapDialogProps = {
  token: string
  open: boolean
  setClosed?: () => void
  onClose?: (location: DiciLocation | null) => void
  onPickedLocation?: (location: DiciLocation | null) => void
  defaultValue?: DiciLocation | null
  className?: string
}

function MapDialog({
  token,
  open,
  setClosed,
  onClose,
  onPickedLocation,
  defaultValue,
  className
}: MapDialogProps) {
  const { t } = useTranslation('common');
  const [location, setLocation] = useState<DiciLocation | null>(
    defaultValue || null
  );

  function handleClose() {
    if (setClosed) {
      setClosed();
    }
    if (onClose) {
      onClose(location);
    }
  }

  const handleCallback = useCallback(
    (location: DiciLocation | null) => {
      if (onPickedLocation) {
        onPickedLocation(location);
      }
      setLocation(location);
    },
    [onPickedLocation]
  );

  return (
    <Dialog
      className="min-w-[98%] md:h-full dark:bg-gray-900 opacity-100 m-0 shadow-none rounded-none map"
      isOpen={open}
      onClose={handleClose}
      aria-label={t('map')}
      PrimaryAction={(
        <Button name="pick-location" onClick={handleClose} disabled={!location}>
          {t('Pick Location Button')}
        </Button>
      )}
      SecondaryAction={(
        <Button variant="secondary" onClick={handleClose}>
          {t('Cancel')}
        </Button>
      )}
    >
      <Map
        defaultValue={defaultValue}
        token={token}
        className={className}
        callback={handleCallback}
        placeholder={t('Drag Map to Choose a Location Hint')}
      />
    </Dialog>
  );
}

export { Map, MapDialog };
