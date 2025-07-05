"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader } from '@googlemaps/js-api-loader';

interface LocationData {
  address: string;
  lat: number;
  lng: number;
}

interface AddressAutocompleteProps {
  onLocationSelect: (location: LocationData) => void;
  value?: string;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function AddressAutocomplete({
  onLocationSelect,
  value = '',
  placeholder = 'Enter address...',
  label = 'Address',
  required = false,
  disabled = false
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (disabled) return;

    let timeoutId: NodeJS.Timeout;
    let retryTimeoutId: NodeJS.Timeout;

    const waitForDOMAndInitialize = () => {
      if (!inputRef.current) {
        timeoutId = setTimeout(waitForDOMAndInitialize, 50);
        return;
      }
      initializeGoogleMaps();
    };

    const initializeGoogleMaps = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        
        if (!apiKey) {
          throw new Error('Google Maps API key is missing');
        }
        
        const loader = new Loader({
          apiKey,
          version: 'weekly',
          libraries: ['places']
        });

        await loader.load();
        setIsLoaded(true);

        if (inputRef.current) {
          const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
            types: ['establishment', 'geocode'],
            fields: ['formatted_address', 'geometry', 'name'],
            componentRestrictions: { country: 'gy' }
          });

          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            
            if (place.geometry?.location && place.formatted_address) {
              const locationData: LocationData = {
                address: place.formatted_address,
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
              };
              
              setInputValue(place.formatted_address);
              onLocationSelect(locationData);
            }
          });

          autocompleteRef.current = autocomplete;
          setError(null);
        } else {
          throw new Error('Input element not available');
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load Google Maps');
        
        if (error instanceof Error && error.message.includes('Input element not available')) {
          retryTimeoutId = setTimeout(() => {
            if (inputRef.current && !autocompleteRef.current) {
              initializeGoogleMaps();
            }
          }, 1000);
        }
      }
    };

    waitForDOMAndInitialize();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (retryTimeoutId) clearTimeout(retryTimeoutId);
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [disabled]);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    if (newValue === '') {
      onLocationSelect({ address: '', lat: 0, lng: 0 });
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor="address-input">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <Input
        ref={inputRef}
        id="address-input"
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder={disabled ? 'Address input disabled' : placeholder}
        required={required}
        disabled={disabled}
        className={disabled ? 'bg-gray-100 text-gray-500' : ''}
      />
      {disabled && (
        <p className="text-xs text-gray-500">Manual location entry mode</p>
      )}
    </div>
  );
}