/// <reference types="@types/google.maps" />
import { useState, useCallback, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Libraries } from '@react-google-maps/api';

interface MapProps {
  addresses: string[];
}

const containerStyle = {
  width: '100%',
  height: '300px'
};

const center = {
  lat: 52.3676,
  lng: 4.9041
};

const libraries: Libraries = ['places'];

export default function Map({ addresses }: MapProps) {
  console.log('Map component rendering with API key:', 
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.substring(0, 8) + '...');

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
    version: "weekly"
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedAddresses] = useState(new Set<string>());

  // Handle initial map load
  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  // Handle map unmount
  const onUnmount = useCallback(() => {
    markers.forEach(marker => marker.setMap(null));
    setMarkers([]);
    setMap(null);
    processedAddresses.clear();
  }, [markers, processedAddresses]);

  // Handle marker creation separately from map load
  useEffect(() => {
    if (!map || !isLoaded || typeof window === 'undefined' || !window.google) return;
    if (isProcessing) return; // Prevent concurrent processing
    
    // Safety check: don't process if all addresses have been processed
    const newAddresses = addresses.filter(addr => !processedAddresses.has(addr));
    if (newAddresses.length === 0) return;

    setIsProcessing(true);
    console.log('Processing new addresses:', newAddresses);

    const geocoder = new window.google.maps.Geocoder();
    const bounds = new window.google.maps.LatLngBounds();
    const newMarkers: google.maps.Marker[] = [];

    // Create markers for each new address
    let completedGeocoding = 0;
    newAddresses.forEach(address => {
      if (processedAddresses.has(address)) return;
      
      const searchAddress = address.includes('Amsterdam') ? address : `${address}, Amsterdam, Netherlands`;
      console.log('Geocoding address:', searchAddress);
      processedAddresses.add(address);

      geocoder.geocode(
        { address: searchAddress },
        (results, status) => {
          completedGeocoding++;
          
          if (status === 'OK' && results?.[0]?.geometry?.location) {
            console.log('Geocoding successful for:', searchAddress);
            
            const marker = new window.google.maps.Marker({
              position: results[0].geometry.location,
              map: map,
              title: address,
              animation: window.google.maps.Animation.DROP
            });
            
            newMarkers.push(marker);
            bounds.extend(results[0].geometry.location);
            
            // Only update bounds when all geocoding is complete
            if (completedGeocoding === newAddresses.length) {
              setMarkers(prev => [...prev, ...newMarkers]);
              map.fitBounds(bounds);
              if (newAddresses.length === 1) {
                map.setZoom(15);
              }
              setIsProcessing(false);
            }
          } else {
            console.error('Geocoding failed for:', searchAddress, 'Status:', status);
            if (completedGeocoding === newAddresses.length) {
              setIsProcessing(false);
            }
          }
        }
      );
    });

    // Safety timeout to prevent hanging
    const timeout = setTimeout(() => {
      if (isProcessing) {
        console.warn('Geocoding timeout reached, resetting processing state');
        setIsProcessing(false);
      }
    }, 10000); // 10 second timeout

    return () => {
      clearTimeout(timeout);
    };
  }, [map, addresses, isLoaded]); // Removed markers from dependencies

  if (loadError) {
    return (
      <div className="w-full h-[300px] rounded-lg bg-[#2a2a2a] flex items-center justify-center text-red-400 p-4 text-center">
        <div className="max-w-md">
          <p className="font-medium mb-2">Error loading Google Maps</p>
          <p className="text-sm text-gray-400">{loadError.toString()}</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-[300px] rounded-lg bg-[#2a2a2a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full h-[300px] rounded-lg overflow-hidden shadow-lg">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={13}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          fullscreenControl: true,
          streetViewControl: true,
          mapTypeControl: true,
          zoomControl: true,
          scaleControl: true,
          rotateControl: true,
          clickableIcons: true
        }}
      />
    </div>
  );
} 