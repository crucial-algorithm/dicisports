import { MapPinIcon } from '@heroicons/react/24/solid';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import type { MapboxOptions } from 'mapbox-gl';
import mapboxgl from 'mapbox-gl';
import { ProgressSpinner } from 'primereact/progressspinner';
import type { ChangeEvent } from 'react';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import FormField from '~/components/shared/form/FormField';

import type { DiciLocation } from '~/types';

type MapInfo = {
  lat: number;
  lng: number;
  zoom: number;
  shortAddress?: string;
  placeName?: string;
  userInputedName?: string;
};

type MapBoxFeature = {
  text: string;
  place_name: string;
  context: Array<{ id: string; wikidata?: string; text: string }>;
};

type Props = {
  name: string;
  token: string;
  defaultValue?: DiciLocation | null;
  defaultPlaceName?: string | null;
  error?: string;
} & Omit<React.ComponentProps<'div'>, 'defaultValue'>;

const MAPBOX_URL = 'api.mapbox.com/geocoding/v5/mapbox.places';
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

const MAPBOX_TEST_STYLE = {
  version: 8,
  sources: {
    land: {
      type: 'geojson',
      data: '/test/land.json'
    }
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#72d0f2'
      }
    },
    {
      id: 'land',
      type: 'fill',
      source: 'land',
      paint: {
        'fill-color': '#f0e9e1'
      }
    }
  ]
};

export default function LocationPicker({
  token,
  defaultValue,
  defaultPlaceName,
  name,
  error
}: Props) {
  const { t } = useTranslation('common');

  const coords = !defaultValue
    ? [40.211945184369455, -8.432174917415097]
    : defaultValue.coords.split(',').map((p) => parseFloat(p));

  const [location, setLocation] = useState<DiciLocation | null>(
    defaultValue || null
  );

  const [info, setInfo] = useState<MapInfo>({
    lat: coords[0],
    lng: coords[1],
    zoom: 15,
    placeName: defaultPlaceName || '',
    userInputedName: defaultPlaceName || ''
  });
  const searchInputWrapper = useRef<HTMLDivElement>(null);
  const placeNameInput = useRef<HTMLInputElement>(null);
  const mapWrapper = React.useRef<HTMLDivElement>(null);
  const locationPickerWrapper = React.useRef<HTMLDivElement>(null);

  const searchInput = new MapboxGeocoder({
    accessToken: token,
    zoom: 15,
    mapboxgl,
    reverseGeocode: false
  });

  React.useEffect(() => {
    if (typeof window === 'undefined' || mapWrapper.current === null) {
      return;
    }

    const mapBoxOptions: MapboxOptions = {
      container: mapWrapper.current,
      accessToken: token,
      style: MAP_STYLE,
      center: [info.lng, info.lat],
      zoom: info.zoom,
      boxZoom: false
    };

    const hackyEnableTestMode = window.localStorage.getItem('cypress.mapbox');

    if (hackyEnableTestMode && hackyEnableTestMode === 'test') {
      mapBoxOptions.testMode = true;
      // @ts-ignore
      mapBoxOptions.style = MAPBOX_TEST_STYLE;
      mapBoxOptions.accessToken = undefined;
    }

    const map = new mapboxgl.Map(mapBoxOptions);

    map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
      }),
      'bottom-right'
    );

    map.on('moveend', () => {
      const center = map.getCenter();

      fetchAddress(center.lat, center.lng, token).then((lc) => {
        if (lc === null) {
          return;
        }

        // behaviour we want to have:
        // 1. if the user inputed something, don't override it!
        // 2. if the user cleaned the input himself, write the short address to the place name and...
        // 3. if the user moves the map several times, without the user changing the value in the input, override
        //    with the new short address until the user writes again to the input
        const userInputedName =
          (placeNameInput.current &&
            placeNameInput.current.getAttribute('data-user-inputed-name')) ||
          '';

        setInfo({
          lat: center.lat,
          lng: center.lng,
          zoom: map.getZoom(),
          shortAddress: capitalize(lc.shortAddress),
          placeName:
            userInputedName.length > 0
              ? userInputedName
              : capitalize(lc.shortAddress),
          userInputedName
        });

        // set the value of the input placeholder to the new selected location
        searchInput.setPlaceholder(lc.shortAddress || '');
        // persist new location
        setLocation(lc);

        placeNameInput.current && placeNameInput.current.select();
      });
    });

    map.on('load', () => {
      locationPickerWrapper.current &&
        locationPickerWrapper.current.classList.add('dc-map-loaded');

      if (!searchInputWrapper.current) {
        return;
      }

      searchInputWrapper.current.classList.remove('input-text');
      searchInputWrapper.current.appendChild(searchInput.onAdd(map));
      searchInput.setPlaceholder(t('Location Placeholder'));
    });

    return () => {
      map.remove();
    };
  }, []);

  function handleOnLocationNameChange(e: ChangeEvent<HTMLInputElement>) {
    setInfo({
      ...info,
      userInputedName: e.target.value,
      placeName: e.target.value
    });
  }

  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-4 gap-4 mb-8"
      ref={locationPickerWrapper}
      data-location-picker={name}
    >
      <FormField label={t('Location')}>
        <div ref={searchInputWrapper} className="min-h-[60px] input-text relative">
          <ProgressSpinner
            className="dc-map-loading"
            style={{ width: 20, height: 20 }}
            strokeWidth="8"
          />
        </div>
      </FormField>

      <div className="relative left-0 md:w-112 h-112 rounded overflow-hidden md:row-span-4">
        <Label
          label={
            info.shortAddress ||
            defaultPlaceName ||
            t('Drag Map to Choose a Location Hint')
          }
        />
        <Pin />
        <div ref={mapWrapper} className="h-full" />
      </div>

      <FormField label={t('Location Name')} error={error}>
        <input
          type="text"
          className="input-text"
          name={`place4${name}`}
          placeholder={t('Location Name Placeholder')}
          ref={placeNameInput}
          onChange={handleOnLocationNameChange}
          data-user-inputed-name={info.userInputedName}
          value={info.placeName || ''}
        />
      </FormField>

      <input
        type="hidden"
        name={name}
        value={location ? JSON.stringify(location) : ''}
      />
    </div>
  );
}

function Pin() {
  return (
    <div className="z-10 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 dc-map-pin">
      <MapPinIcon className="text-black w-6 h-6" />
    </div>
  );
}

function Label({ label }: { label: string | null }) {
  return label ? (
    <div
      className={`z-10 absolute left-1/2 [top:calc(50%-32px)] -translate-x-1/2 -translate-y-1/2 
                     bg-black text-white text-xs font-semibold py-1 px-2.5 rounded-[50px] dc-map-label`}
    >
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
  if (!str) {
    return str;
  }
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

async function fetchAddress(
  lat: number,
  lng: number,
  token: string
): Promise<DiciLocation | null> {
  const location = [lng, lat].join(',');
  const url = `https://${MAPBOX_URL}/${location}.json?limit=1&types=${types.join(
    '%2C'
  )}&access_token=${token}`;
  const res = await fetch(url);
  const json = await res.json();
  const feature = json.features[0] || null;

  if (!feature) {
    return null;
  }
  return processMapBoxFeature(feature, lat, lng);
}
