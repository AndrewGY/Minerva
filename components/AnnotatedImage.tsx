"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import Image from 'next/image';

interface Circle {
  id: string;
  x: number;
  y: number;
  radius: number;
  normalizedX: number;
  normalizedY: number;
  normalizedRadius: number;
}

interface AnnotatedImageProps {
  src: string;
  alt: string;
  annotations?: Circle[];
  className?: string;
  showAnnotations?: boolean;
}

export default function AnnotatedImage({
  src,
  alt,
  annotations = [],
  className = "",
  showAnnotations = true
}: AnnotatedImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [scaledAnnotations, setScaledAnnotations] = useState<Circle[]>([]);

  console.log('AnnotatedImage received annotations:', annotations); // Debug logging

  const updateAnnotations = useCallback(() => {
    if (!containerRef.current || annotations.length === 0) {
      setScaledAnnotations([]);
      return;
    }

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    // Get the actual displayed image dimensions
    const img = container.querySelector('img');
    if (!img) return;
    
    const imgRect = img.getBoundingClientRect();
    const width = imgRect.width;
    const height = imgRect.height;

    setImageDimensions({ width, height });

    const scaledCircles = annotations.map(circle => ({
      ...circle,
      x: circle.normalizedX * width,
      y: circle.normalizedY * height,
      radius: Math.max(circle.normalizedRadius * Math.min(width, height), 20) // Minimum radius of 20px
    }));
    
    setScaledAnnotations(scaledCircles);
    console.log('Updated annotations:', scaledCircles); // Debug logging
  }, [annotations]);

  useEffect(() => {
    updateAnnotations();
    
    // Update annotations when window resizes
    const handleResize = () => {
      setTimeout(updateAnnotations, 100);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateAnnotations]);

  const handleImageLoad = () => {
    // Small delay to ensure the image is fully rendered
    setTimeout(updateAnnotations, 100);
  };

  if (!showAnnotations || annotations.length === 0) {
    return (
      <div ref={containerRef} className={`relative ${className}`}>
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          onLoad={handleImageLoad}
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        onLoad={handleImageLoad}
      />
      
      {/* Annotation overlays */}
      {scaledAnnotations.map((circle, index) => (
        <div
          key={circle.id}
          className="absolute border-3 border-red-500 rounded-full bg-red-500 bg-opacity-20 pointer-events-none animate-pulse"
          style={{
            left: circle.x - circle.radius,
            top: circle.y - circle.radius,
            width: circle.radius * 2,
            height: circle.radius * 2,
            borderWidth: '3px',
          }}
        >
          {/* Annotation number */}
          <div
            className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-sm px-2 py-1 rounded font-bold shadow-lg"
            style={{ fontSize: '12px' }}
          >
            {index + 1}
          </div>
          {/* Center dot */}
          <div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full"
            style={{ width: '6px', height: '6px' }}
          />
        </div>
      ))}
      
      {/* Annotation count indicator */}
      {annotations.length > 0 && (
        <div className="absolute top-2 right-2 bg-red-500 text-white text-sm px-3 py-1 rounded-full font-bold shadow-lg">
          {annotations.length} annotation{annotations.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}