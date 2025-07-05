"use client";

import React, { useEffect, useRef } from 'react';
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

// Guyana boundary coordinates
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
  const mapRef = useRef<L.Map | null>(null);
  const heatLayerRef = useRef<any>(null);

  useEffect(() => {
    // Initialize map
    if (!mapRef.current) {
      mapRef.current = L.map('guyana-heatmap', {
        center: [4.860416, -58.93018],
        zoom: 7,
        minZoom: 6,
        maxZoom: 12,
      });

      // Add base map layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapRef.current);

      // Add Guyana boundary
      L.polygon(guyanaPolygon as L.LatLngExpression[], {
        color: '#2563eb',
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.1,
        fillColor: '#3b82f6'
      }).addTo(mapRef.current);

      // Fit map to Guyana bounds
      const bounds = L.latLngBounds(guyanaPolygon as L.LatLngExpression[]);
      mapRef.current.fitBounds(bounds);
    }

    // Update heatmap data
    if (heatLayerRef.current) {
      mapRef.current?.removeLayer(heatLayerRef.current);
    }

    // Prepare heat data with weighted intensity based on severity
    const heatData: [number, number, number][] = data.map(point => {
      let intensity = 0.5;
      switch (point.severityLevel) {
        case 'CRITICAL':
          intensity = 1.0;
          break;
        case 'HIGH':
          intensity = 0.8;
          break;
        case 'MEDIUM':
          intensity = 0.6;
          break;
        case 'LOW':
          intensity = 0.4;
          break;
      }
      return [point.location.lat, point.location.lng, intensity];
    });

    if (heatData.length > 0) {
      heatLayerRef.current = (L as any).heatLayer(heatData, {
        radius: 25,
        blur: 15,
        maxZoom: 10,
        max: 1.0,
        gradient: {
          0.0: '#22c55e',
          0.4: '#eab308',
          0.6: '#f97316',
          0.8: '#ef4444',
          1.0: '#991b1b'
        }
      }).addTo(mapRef.current!);
    }

    // Add legend
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = function () {
      const div = L.DomUtil.create('div', 'info legend');
      div.style.backgroundColor = 'white';
      div.style.padding = '10px';
      div.style.borderRadius = '5px';
      div.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
      
      div.innerHTML = `
        <h4 style="margin: 0 0 5px 0; font-weight: bold;">Incident Density</h4>
        <div style="display: flex; align-items: center; margin-bottom: 3px;">
          <div style="width: 20px; height: 10px; background: #991b1b; margin-right: 5px;"></div>
          <span>Critical</span>
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 3px;">
          <div style="width: 20px; height: 10px; background: #ef4444; margin-right: 5px;"></div>
          <span>High</span>
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 3px;">
          <div style="width: 20px; height: 10px; background: #f97316; margin-right: 5px;"></div>
          <span>Medium</span>
        </div>
        <div style="display: flex; align-items: center;">
          <div style="width: 20px; height: 10px; background: #22c55e; margin-right: 5px;"></div>
          <span>Low</span>
        </div>
      `;
      
      return div;
    };
    legend.addTo(mapRef.current!);

    // Add incident count
    const countControl = L.control({ position: 'topright' });
    countControl.onAdd = function () {
      const div = L.DomUtil.create('div', 'info');
      div.style.backgroundColor = 'white';
      div.style.padding = '10px';
      div.style.borderRadius = '5px';
      div.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
      div.style.fontWeight = 'bold';
      
      const criticalCount = data.filter(d => d.severityLevel === 'CRITICAL').length;
      const totalCount = data.length;
      
      div.innerHTML = `
        <div>Total Incidents: ${totalCount}</div>
        ${criticalCount > 0 ? `<div style="color: #ef4444;">Critical: ${criticalCount}</div>` : ''}
      `;
      
      return div;
    };
    countControl.addTo(mapRef.current!);

    return () => {
      // Cleanup legend and count on component unmount
      mapRef.current?.removeControl(legend);
      mapRef.current?.removeControl(countControl);
    };
  }, [data]);

  return (
    <div id="guyana-heatmap" style={{ height: '500px', width: '100%', borderRadius: '0.5rem' }} />
  );
}