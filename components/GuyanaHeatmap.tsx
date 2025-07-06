"use client";

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
});

interface HeatmapData {
  location: { lat: number; lng: number };
  severityLevel: string;
  incidentType: string;
}

interface GuyanaHeatmapProps {
  data: HeatmapData[];
}

// Extend Leaflet's map type to include heatLayer
declare module 'leaflet' {
  export function heatLayer(
    points: Array<[number, number, number?]>,
    options?: any
  ): any;
}

// Guyana boundary coordinates (simplified for better performance)
const guyanaPolygon = [
  [8.557, -59.831],
  [8.033, -59.985],
  [7.046, -60.000],
  [6.000, -61.160],
  [5.000, -60.730],
  [4.500, -60.145],
  [3.950, -59.538],
  [3.437, -59.848],
  [2.723, -59.848],
  [2.350, -59.850],
  [1.970, -59.508],
  [1.840, -59.230],
  [1.188, -59.758],
  [1.317, -60.000],
  [1.385, -60.499],
  [2.112, -61.000],
  [2.259, -61.390],
  [2.523, -61.513],
  [3.000, -61.000],
  [3.500, -61.300],
  [3.895, -61.517],
  [4.000, -61.508],
  [4.500, -61.500],
  [5.000, -61.389],
  [5.194, -61.385],
  [5.989, -61.130],
  [6.811, -61.133],
  [7.199, -61.000],
  [7.481, -60.511],
  [7.811, -60.000],
  [8.347, -60.004],
  [8.495, -59.991],
  [8.557, -59.831]
];

export default function GuyanaHeatmap({ data }: GuyanaHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize the map once and handle all updates
  useEffect(() => {
    let isMounted = true;
    
    const initializeMap = async () => {
      if (!containerRef.current || mapInstanceRef.current) {
        return;
      }

      try {
        // Wait for container to be ready
        const container = containerRef.current;
        await new Promise(resolve => {
          const checkSize = () => {
            const rect = container.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              resolve(void 0);
            } else {
              setTimeout(checkSize, 50);
            }
          };
          checkSize();
        });

        if (!isMounted) return;

        // Create map with defensive settings
        const map = L.map(container, {
          center: [4.860416, -58.93018],
          zoom: 7,
          minZoom: 6,
          maxZoom: 12,
          zoomControl: true,
          attributionControl: false,
          preferCanvas: true, // Use canvas for better performance
        });

        // Add tiles
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
          maxZoom: 12,
        });
        tileLayer.addTo(map);

        // Add Guyana boundary
        const boundaryLayer = L.polygon(guyanaPolygon as L.LatLngExpression[], {
          color: '#2563eb',
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.1,
          fillColor: '#3b82f6'
        });
        boundaryLayer.addTo(map);

        // Fit to bounds
        const bounds = L.latLngBounds(guyanaPolygon as L.LatLngExpression[]);
        map.fitBounds(bounds, { padding: [20, 20] });

        // Store map reference
        mapInstanceRef.current = map;

        if (isMounted) {
          setIsLoading(false);
          setError(null);
        }
      } catch (err) {
        console.error('Map initialization error:', err);
        if (isMounted) {
          setError('Failed to load map');
          setIsLoading(false);
        }
      }
    };

    initializeMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          console.warn('Error removing map:', e);
        }
        mapInstanceRef.current = null;
      }
    };
  }, []); // Only run once

  // Handle data updates separately
  useEffect(() => {
    if (!mapInstanceRef.current || isLoading) return;

    const map = mapInstanceRef.current;
    let heatLayer: any = null;
    let statsControl: any = null;
    let legendControl: any = null;

    try {
      // Add stats control
      statsControl = (L as any).control({ position: 'topright' });
      statsControl.onAdd = function () {
        const div = L.DomUtil.create('div', 'leaflet-control leaflet-bar');
        div.style.backgroundColor = 'white';
        div.style.padding = '8px 12px';
        div.style.fontSize = '13px';
        div.style.fontWeight = 'bold';
        div.style.borderRadius = '4px';
        div.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
        
        if (!data || data.length === 0) {
          div.innerHTML = 'No incident data';
        } else {
          const critical = data.filter(d => d.severityLevel === 'CRITICAL').length;
          const high = data.filter(d => d.severityLevel === 'HIGH').length;
          
          div.innerHTML = `
            <div style="color: #1f2937;">Total: ${data.length}</div>
            ${critical > 0 ? `<div style="color: #ef4444; font-size: 11px;">Critical: ${critical}</div>` : ''}
            ${high > 0 ? `<div style="color: #f97316; font-size: 11px;">High: ${high}</div>` : ''}
          `;
        }
        
        return div;
      };
      statsControl.addTo(map);

      // Add heatmap if data exists
      if (data && data.length > 0) {
        const heatData: [number, number, number][] = data.map(point => {
          let intensity = 0.5;
          switch (point.severityLevel) {
            case 'CRITICAL': intensity = 1.0; break;
            case 'HIGH': intensity = 0.8; break;
            case 'MEDIUM': intensity = 0.6; break;
            case 'LOW': intensity = 0.4; break;
            default: intensity = 0.5;
          }
          return [point.location.lat, point.location.lng, intensity];
        });

        heatLayer = (L as any).heatLayer(heatData, {
          radius: 25,
          blur: 15,
          maxZoom: 10,
          max: 1.0,
          gradient: {
            0.0: '#22c55e', // Green (low)
            0.4: '#eab308', // Yellow
            0.6: '#f97316', // Orange
            0.8: '#ef4444', // Red
            1.0: '#991b1b'  // Dark red (critical)
          }
        });
        heatLayer.addTo(map);

        // Add legend
        legendControl = (L as any).control({ position: 'bottomright' });
        legendControl.onAdd = function () {
          const div = L.DomUtil.create('div', 'leaflet-control leaflet-bar');
          div.style.backgroundColor = 'white';
          div.style.padding = '8px';
          div.style.fontSize = '11px';
          div.style.borderRadius = '4px';
          div.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
          
          div.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 4px;">Severity</div>
            <div style="display: flex; align-items: center; margin-bottom: 2px;">
              <div style="width: 12px; height: 6px; background: #991b1b; margin-right: 4px;"></div>
              <span>Critical</span>
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 2px;">
              <div style="width: 12px; height: 6px; background: #ef4444; margin-right: 4px;"></div>
              <span>High</span>
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 2px;">
              <div style="width: 12px; height: 6px; background: #f97316; margin-right: 4px;"></div>
              <span>Medium</span>
            </div>
            <div style="display: flex; align-items: center;">
              <div style="width: 12px; height: 6px; background: #22c55e; margin-right: 4px;"></div>
              <span>Low</span>
            </div>
          `;
          
          return div;
        };
        legendControl.addTo(map);
      }
    } catch (err) {
      console.error('Error updating heatmap data:', err);
    }

    // Cleanup function for this effect
    return () => {
      try {
        if (heatLayer && map) {
          map.removeLayer(heatLayer);
        }
        if (statsControl && map) {
          map.removeControl(statsControl);
        }
        if (legendControl && map) {
          map.removeControl(legendControl);
        }
      } catch (e) {
        console.warn('Error cleaning up layers:', e);
      }
    };
  }, [data, isLoading]);

  if (error) {
    return (
      <div style={{ 
        height: '400px', 
        width: '100%', 
        borderRadius: '0.5rem',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: '14px', fontWeight: '500' }}>{error}</div>
          <div style={{ fontSize: '12px', marginTop: '4px' }}>Please refresh to try again</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(248, 250, 252, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          borderRadius: '0.5rem'
        }}>
          <div style={{ color: '#64748b', fontSize: '14px' }}>Loading map...</div>
        </div>
      )}
      <div 
        ref={containerRef} 
        style={{ 
          height: '400px', 
          width: '100%', 
          borderRadius: '0.5rem',
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }} 
      />
    </div>
  );
}