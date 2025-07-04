"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Target, Eye, EyeOff } from 'lucide-react';

interface Circle {
  id: string;
  x: number;
  y: number;
  radius: number;
  normalizedX: number;
  normalizedY: number;
  normalizedRadius: number;
}

interface AnnotationViewerProps {
  imageUrl: string;
  fileName: string;
  annotations: Circle[];
  onClose?: () => void;
  showStats?: boolean;
}

export default function AnnotationViewer({
  imageUrl,
  fileName,
  annotations,
  onClose,
  showStats = false
}: AnnotationViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [selectedCircle, setSelectedCircle] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [scaledAnnotations, setScaledAnnotations] = useState<Circle[]>([]);

  const drawImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      const maxWidth = 800;
      const maxHeight = 600;
      let { width, height } = img;
      const originalWidth = width;
      const originalHeight = height;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;
      setImageDimensions({ width, height });

      ctx.drawImage(img, 0, 0, width, height);
      
      const scaledCircles = annotations.map(circle => ({
        ...circle,
        x: circle.normalizedX * width,
        y: circle.normalizedY * height,
        radius: circle.normalizedRadius * Math.min(width, height)
      }));
      
      setScaledAnnotations(scaledCircles);
      setImageLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl, annotations]);

  const drawAnnotations = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !showAnnotations) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    scaledAnnotations.forEach((circle, index) => {
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
      ctx.strokeStyle = circle.id === selectedCircle ? '#ef4444' : '#3b82f6';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.fillStyle = circle.id === selectedCircle ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)';
      ctx.fill();

      ctx.fillStyle = circle.id === selectedCircle ? '#ef4444' : '#3b82f6';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${index + 1}`, circle.x, circle.y - circle.radius - 5);
    });
  }, [scaledAnnotations, selectedCircle, showAnnotations]);

  useEffect(() => {
    drawImage();
  }, [drawImage]);

  useEffect(() => {
    if (imageLoaded) {
      drawImage();
      drawAnnotations();
    }
  }, [showAnnotations, selectedCircle, imageLoaded, drawImage, drawAnnotations]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedCircle = scaledAnnotations.find(circle => {
      const distance = Math.sqrt(Math.pow(x - circle.x, 2) + Math.pow(y - circle.y, 2));
      return distance <= circle.radius;
    });

    setSelectedCircle(clickedCircle ? clickedCircle.id : null);
  };

  const toggleAnnotations = () => {
    setShowAnnotations(!showAnnotations);
    setSelectedCircle(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Annotations - {fileName}
            </CardTitle>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 justify-between items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAnnotations}
            >
              {showAnnotations ? (
                <>
                  <EyeOff className="w-4 h-4 mr-1" />
                  Hide Annotations
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-1" />
                  Show Annotations
                </>
              )}
            </Button>
            
            {showStats && (
              <div className="text-sm text-gray-600">
                {annotations.length} annotation(s) found
              </div>
            )}
          </div>

          <div className="border rounded-lg overflow-hidden bg-gray-50">
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              style={{ cursor: 'pointer' }}
              className="max-w-full max-h-[60vh] object-contain"
            />
          </div>

          {annotations.length > 0 && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="font-medium mb-2">Annotations ({annotations.length})</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                {annotations.map((circle, index) => (
                  <div
                    key={circle.id}
                    className={`p-2 rounded border cursor-pointer transition-colors ${
                      circle.id === selectedCircle ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => setSelectedCircle(circle.id)}
                  >
                    <div className="font-medium">Annotation {index + 1}</div>
                    <div className="text-gray-600">
                      Position: ({Math.round(circle.normalizedX * 100)}%, {Math.round(circle.normalizedY * 100)}%)
                    </div>
                    <div className="text-gray-600">
                      Size: {Math.round(circle.normalizedRadius * 100)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {annotations.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No annotations found for this image
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}