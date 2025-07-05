"use client";

import React, { useEffect, useRef, useState } from 'react';
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

  useEffect(() => {
    const initializeAutocomplete = async () => {
      try {
        const loader = new Loader({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
          version: 'weekly',
          libraries: ['places']
        });

        await loader.load();
        setIsLoaded(true);

        if (inputRef.current) {
          // Create autocomplete with Guyana bounds
          const guyanaCenter = { lat: 4.860416, lng: -58.93018 };
          const guyanaCircle = new google.maps.Circle({
            center: guyanaCenter,
            radius: 500000 // 500km radius to cover all of Guyana
          });

          const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
            types: ['establishment', 'geocode'],
            fields: ['formatted_address', 'geometry', 'name'],
            bounds: guyanaCircle.getBounds()!,
            strictBounds: true,
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
        }
      } catch (error) {
        console.error('Error loading Google Maps API:', error);
      }
    };

    if (!disabled) {
      initializeAutocomplete();
    }

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [onLocationSelect, disabled]);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    
    // If user is typing manually and clears the field, notify parent
    if (e.target.value === '') {
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
      {!isLoaded && !disabled && (
        <p className="text-xs text-gray-500">Loading address autocomplete...</p>
      )}
      {disabled && (
        <p className="text-xs text-gray-500">Manual location entry mode</p>
      )}
    </div>
  );
}