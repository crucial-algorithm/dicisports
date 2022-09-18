import * as React from 'react';

type LocationContextType = [
  [number, number] | null,
  React.Dispatch<React.SetStateAction<[number, number] | null>>
];


const LocationContext = React.createContext<LocationContextType | undefined>(
  undefined
);

LocationContext.displayName = 'LocationContext';


function useUserLocation() {
  const context = React.useContext(LocationContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}


function LocationProvider({
  children,
  userLocation
}: {
  children: React.ReactNode;
  userLocation: [number, number] | null;
}) {
  const [location, setLocation] = React.useState<[number, number] | null>(userLocation);

  return (
    <LocationContext.Provider value={[location, setLocation]}>
      {children}
    </LocationContext.Provider>
  );
}


export {
  useUserLocation,
  LocationProvider
};
