"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, RotateCcw, Save, X } from 'lucide-react';

interface Circle {
  id: string;
  x: number;
  y: number;
  radius: number;
  normalizedX: number;
  normalizedY: number;
  normalizedRadius: number;
}

interface ImageAnnotationProps {
  imageUrl: string;
  fileName: string;
  onAnnotationComplete: (annotations: Circle[]) => void;
  onCancel: () => void;
  initialAnnotations?: Circle[];
}

export default function ImageAnnotation({
  imageUrl,
  fileName,
  onAnnotationComplete,
  onCancel,
  initialAnnotations = []
}: ImageAnnotationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [circles, setCircles] = useState<Circle[]>(initialAnnotations);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentCircle, setCurrentCircle] = useState<{ x: number; y: number; radius: number } | null>(null);
  const [selectedCircle, setSelectedCircle] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);

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

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;
      setImageDimensions({ width, height });

      ctx.drawImage(img, 0, 0, width, height);
      setImageLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      circles.forEach(circle => {
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
        ctx.strokeStyle = circle.id === selectedCircle ? '#ef4444' : '#3b82f6';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = circle.id === selectedCircle ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)';
        ctx.fill();
      });

      if (currentCircle) {
        ctx.beginPath();
        ctx.arc(currentCircle.x, currentCircle.y, currentCircle.radius, 0, 2 * Math.PI);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
        ctx.fill();
      }
    };
    img.src = imageUrl;
  }, [imageUrl, circles, currentCircle, selectedCircle, imageLoaded]);

  useEffect(() => {
    drawImage();
  }, [drawImage]);

  useEffect(() => {
    if (imageLoaded) {
      redrawCanvas();
    }
  }, [circles, currentCircle, selectedCircle, imageLoaded, redrawCanvas]);

  const getMousePosition = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePosition(e);
    
    const clickedCircle = circles.find(circle => {
      const distance = Math.sqrt(Math.pow(pos.x - circle.x, 2) + Math.pow(pos.y - circle.y, 2));
      return distance <= circle.radius;
    });

    if (clickedCircle) {
      setSelectedCircle(clickedCircle.id);
      setIsDragging(true);
      setDragOffset({
        x: pos.x - clickedCircle.x,
        y: pos.y - clickedCircle.y
      });
      return;
    }

    setSelectedCircle(null);
    setIsDrawing(true);
    setStartPoint(pos);
    setCurrentCircle({ x: pos.x, y: pos.y, radius: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePosition(e);

    if (isDragging && selectedCircle && dragOffset) {
      const newX = pos.x - dragOffset.x;
      const newY = pos.y - dragOffset.y;
      
      setCircles(prev => prev.map(circle => 
        circle.id === selectedCircle 
          ? { 
              ...circle, 
              x: newX, 
              y: newY,
              normalizedX: newX / imageDimensions.width,
              normalizedY: newY / imageDimensions.height
            }
          : circle
      ));
      return;
    }

    if (isDrawing && startPoint) {
      const radius = Math.sqrt(Math.pow(pos.x - startPoint.x, 2) + Math.pow(pos.y - startPoint.y, 2));
      setCurrentCircle({ x: startPoint.x, y: startPoint.y, radius });
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragOffset(null);
      return;
    }

    if (isDrawing && currentCircle && startPoint) {
      if (currentCircle.radius > 10) {
        const newCircle: Circle = {
          id: `circle-${Date.now()}`,
          x: currentCircle.x,
          y: currentCircle.y,
          radius: currentCircle.radius,
          normalizedX: currentCircle.x / imageDimensions.width,
          normalizedY: currentCircle.y / imageDimensions.height,
          normalizedRadius: currentCircle.radius / Math.min(imageDimensions.width, imageDimensions.height)
        };
        
        setCircles(prev => [...prev, newCircle]);
      }

      setIsDrawing(false);
      setStartPoint(null);
      setCurrentCircle(null);
    }
  };

  const deleteSelectedCircle = () => {
    if (selectedCircle) {
      setCircles(prev => prev.filter(circle => circle.id !== selectedCircle));
      setSelectedCircle(null);
    }
  };

  const clearAllCircles = () => {
    setCircles([]);
    setSelectedCircle(null);
  };

  const handleSave = () => {
    onAnnotationComplete(circles);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Mark Incident Locations - {fileName}</CardTitle>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            <strong>Instructions:</strong> Draw circles around areas where you believe the incident occurred or safety hazards are visible. Click and drag to create circles, then click existing circles to move or select them for deletion.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={deleteSelectedCircle}
              disabled={!selectedCircle}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete Selected
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllCircles}
              disabled={circles.length === 0}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Clear All
            </Button>
            <div className="flex-1">
              {isDrawing && (
                <span className="text-sm text-green-600 font-medium">
                  Drawing incident area... drag to set circle size
                </span>
              )}
              {isDragging && (
                <span className="text-sm text-red-600 font-medium">
                  Moving incident marker... drag to change its position
                </span>
              )}
            </div>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-1" />
              Save Incident Markers
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden bg-gray-50">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ 
                cursor: isDrawing ? 'crosshair' : isDragging ? 'grabbing' : 'pointer',
                border: isDrawing ? '2px solid #10b981' : isDragging ? '2px solid #ef4444' : '1px solid #e5e7eb'
              }}
              className="max-w-full max-h-[60vh] object-contain rounded"
            />
          </div>

          {circles.length > 0 && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="font-medium mb-2">Incident Locations ({circles.length})</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                {circles.map((circle, index) => (
                  <div
                    key={circle.id}
                    className={`p-2 rounded border cursor-pointer ${
                      circle.id === selectedCircle ? 'border-red-500 bg-red-50' : 'border-gray-200'
                    }`}
                    onClick={() => setSelectedCircle(circle.id)}
                  >
                    <div className="font-medium">Incident Area {index + 1}</div>
                    <div className="text-gray-600">
                      Position: ({Math.round(circle.normalizedX * 100)}%, {Math.round(circle.normalizedY * 100)}%)
                    </div>
                    <div className="text-gray-600">
                      Size: {Math.round(circle.normalizedRadius * 100)}%
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                💡 These markers help investigators identify specific areas of concern and can be used to train AI models for automatic incident detection.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}