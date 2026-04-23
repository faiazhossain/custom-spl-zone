"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { DrawingMode } from "@/lib/types";

const DRAWING_LAYER_ID = "drawing-layer";
const DRAWING_SOURCE_ID = "drawing-source";
const POINTS_LAYER_ID = "drawing-points-layer";
const POINTS_SOURCE_ID = "drawing-points-source";
const TEMP_LINE_LAYER_ID = "temp-line-layer";
const TEMP_LINE_SOURCE_ID = "temp-line-source";

const DEFAULT_LNG = Number(process.env.NEXT_PUBLIC_DEFAULT_LNG) || 46.6753;
const DEFAULT_LAT = Number(process.env.NEXT_PUBLIC_DEFAULT_LAT) || 24.7136;
const DEFAULT_ZOOM = Number(process.env.NEXT_PUBLIC_DEFAULT_ZOOM) || 5;
const MIN_ZOOM = Number(process.env.NEXT_PUBLIC_MIN_ZOOM) || 4;
const MAX_ZOOM = Number(process.env.NEXT_PUBLIC_MAX_ZOOM) || 18;
const MAP_STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL || "";

interface MapProps {
  drawingMode: DrawingMode;
  onDrawingComplete?: (coordinates: [number, number][]) => void;
  onDrawingCancel?: () => void;
  onPointsChange?: (points: [number, number][]) => void;
  className?: string;
}

export function Map({
  drawingMode,
  onDrawingComplete,
  onDrawingCancel,
  onPointsChange,
  className = "",
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const [mapError, setMapError] = useState<string | null>(
    MAP_STYLE_URL ? null : "Map style URL is not configured"
  );
  const [currentPoints, setCurrentPoints] = useState<[number, number][]>([]);
  const resetNextPointRef = useRef(false);

  // Initialize drawing layers when map loads
  const initializeDrawingLayers = useCallback((mapInstance: MapLibreMap) => {
    // Drawing points source (for vertex markers)
    if (!mapInstance.getSource(POINTS_SOURCE_ID)) {
      mapInstance.addSource(POINTS_SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    }

    // Drawing points layer
    if (!mapInstance.getLayer(POINTS_LAYER_ID)) {
      mapInstance.addLayer({
        id: POINTS_LAYER_ID,
        type: "circle",
        source: POINTS_SOURCE_ID,
        paint: {
          "circle-radius": 6,
          "circle-color": "#9333ea",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });
    }

    // Drawing polygon source
    if (!mapInstance.getSource(DRAWING_SOURCE_ID)) {
      mapInstance.addSource(DRAWING_SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    }

    // Drawing polygon layer (filled)
    if (!mapInstance.getLayer(DRAWING_LAYER_ID)) {
      mapInstance.addLayer({
        id: DRAWING_LAYER_ID,
        type: "fill",
        source: DRAWING_SOURCE_ID,
        paint: {
          "fill-color": "#a855f7",
          "fill-opacity": 0.2,
        },
      });
    }

    // Drawing polygon outline layer
    const outlineLayerId = `${DRAWING_LAYER_ID}-outline`;
    if (!mapInstance.getLayer(outlineLayerId)) {
      mapInstance.addLayer({
        id: outlineLayerId,
        type: "line",
        source: DRAWING_SOURCE_ID,
        paint: {
          "line-color": "#9333ea",
          "line-width": 2,
        },
      });
    }

    // Temporary line source (for line following cursor)
    if (!mapInstance.getSource(TEMP_LINE_SOURCE_ID)) {
      mapInstance.addSource(TEMP_LINE_SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    }

    // Temporary line layer
    if (!mapInstance.getLayer(TEMP_LINE_LAYER_ID)) {
      mapInstance.addLayer({
        id: TEMP_LINE_LAYER_ID,
        type: "line",
        source: TEMP_LINE_SOURCE_ID,
        paint: {
          "line-color": "#c084fc",
          "line-width": 2,
          "line-dasharray": [2, 2],
        },
      });
    }
  }, []);

  // Update drawing visualization
  const updateDrawingVisualization = useCallback(
    (mapInstance: MapLibreMap, points: [number, number][]) => {
      const pointsSource = mapInstance.getSource(POINTS_SOURCE_ID) as maplibregl.GeoJSONSource;
      const polygonSource = mapInstance.getSource(DRAWING_SOURCE_ID) as maplibregl.GeoJSONSource;
      const tempLineSource = mapInstance.getSource(TEMP_LINE_SOURCE_ID) as maplibregl.GeoJSONSource;

      if (pointsSource) {
        pointsSource.setData({
          type: "FeatureCollection",
          features: points.map((point) => ({
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: point,
            },
          })),
        });
      }

      if (polygonSource) {
        if (points.length >= 3) {
          polygonSource.setData({
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "Polygon",
                  coordinates: [[...points, points[0]]],
                },
              },
            ],
          });
        } else {
          polygonSource.setData({
            type: "FeatureCollection",
            features: [],
          });
        }
      }

      if (tempLineSource) {
        // Don't show temp line if polygon is closed (3+ points)
        if (points.length < 3) {
          tempLineSource.setData({
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "LineString",
                  coordinates: points,
                },
              },
            ],
          });
        } else {
          tempLineSource.setData({
            type: "FeatureCollection",
            features: [],
          });
        }
      }
    },
    []
  );

  // Clear drawing visualization
  const clearDrawingVisualization = useCallback((mapInstance: MapLibreMap) => {
    const pointsSource = mapInstance.getSource(POINTS_SOURCE_ID) as maplibregl.GeoJSONSource;
    const polygonSource = mapInstance.getSource(DRAWING_SOURCE_ID) as maplibregl.GeoJSONSource;
    const tempLineSource = mapInstance.getSource(TEMP_LINE_SOURCE_ID) as maplibregl.GeoJSONSource;

    pointsSource?.setData({ type: "FeatureCollection", features: [] });
    polygonSource?.setData({ type: "FeatureCollection", features: [] });
    tempLineSource?.setData({ type: "FeatureCollection", features: [] });
  }, []);

  // Handle map click for adding points
  const handleMapClick = useCallback(
    (e: maplibregl.MapMouseEvent) => {
      if (drawingMode !== "drawing" || !map.current) return;

      const lng = e.lngLat.lng;
      const lat = e.lngLat.lat;
      const newPoint: [number, number] = [lng, lat];

      setCurrentPoints((prev) => {
        const base = resetNextPointRef.current ? [] : prev;
        resetNextPointRef.current = false;
        const updated = [...base, newPoint];
        onPointsChange?.(updated);
        return updated;
      });
    },
    [drawingMode, onPointsChange]
  );

  // Handle map mousemove for cursor preview
  const handleMouseMove = useCallback(
    (e: maplibregl.MapMouseEvent) => {
      if (drawingMode !== "drawing" || !map.current) return;

      const tempLineSource = map.current.getSource(TEMP_LINE_SOURCE_ID) as maplibregl.GeoJSONSource;
      const activePoints = resetNextPointRef.current ? [] : currentPoints;
      if (!tempLineSource || activePoints.length === 0) return;

      // Only show temp line if we have points but haven't closed the polygon yet
      if (activePoints.length < 3) {
        tempLineSource.setData({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: [
                  ...activePoints,
                  [e.lngLat.lng, e.lngLat.lat],
                ],
              },
            },
          ],
        });
      }
    },
    [drawingMode, currentPoints]
  );

  // Handle right-click to finish drawing
  const handleContextMenu = useCallback(
    (e: maplibregl.MapMouseEvent) => {
      if (drawingMode !== "drawing" || !map.current) return;
      e.preventDefault();

      const activePoints = resetNextPointRef.current ? [] : currentPoints;
      if (activePoints.length >= 3) {
        onDrawingComplete?.(activePoints);
      }
    },
    [drawingMode, currentPoints, onDrawingComplete]
  );

  // Handle double-click to add point and complete
  const handleDblClick = useCallback(
    (e: maplibregl.MapMouseEvent) => {
      if (drawingMode !== "drawing" || !map.current) return;
      e.preventDefault();

      const lng = e.lngLat.lng;
      const lat = e.lngLat.lat;
      const newPoint: [number, number] = [lng, lat];

      const base = resetNextPointRef.current ? [] : currentPoints;
      resetNextPointRef.current = false;
      const updated = [...base, newPoint];
      setCurrentPoints(updated);
      onPointsChange?.(updated);

      if (updated.length >= 3) {
        onDrawingComplete?.(updated);
      }
    },
    [drawingMode, currentPoints, onDrawingComplete, onPointsChange]
  );

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (drawingMode !== "drawing") return;

      if (e.key === "Escape") {
        setCurrentPoints([]);
        onPointsChange?.([]);
        onDrawingCancel?.();
      } else if (e.key === "Enter") {
        if (currentPoints.length >= 3) {
          onDrawingComplete?.(currentPoints);
        }
      }
    },
    [drawingMode, currentPoints, onDrawingComplete, onDrawingCancel, onPointsChange]
  );

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    if (!MAP_STYLE_URL) return;

    try {
      const mapInstance = new maplibregl.Map({
        container: mapContainer.current,
        style: MAP_STYLE_URL,
        center: [DEFAULT_LNG, DEFAULT_LAT],
        zoom: DEFAULT_ZOOM,
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
      });

      mapInstance.addControl(
        new maplibregl.NavigationControl({
          showCompass: true,
          showZoom: true,
        }),
        "top-right"
      );

      mapInstance.addControl(new maplibregl.FullscreenControl(), "top-right");

      mapInstance.addControl(
        new maplibregl.ScaleControl({
          maxWidth: 100,
          unit: "metric",
        }),
        "bottom-left"
      );

      mapInstance.on("load", () => {
        initializeDrawingLayers(mapInstance);
      });

      mapInstance.on("error", (e) => {
        console.error("Map error:", e);
        setMapError("Failed to load map. Please try again.");
      });

      map.current = mapInstance;

      return () => {
        map.current?.remove();
        map.current = null;
      };
    } catch (error) {
      console.error("Failed to initialize map:", error);
    }
  }, [initializeDrawingLayers]);

  // Setup click handlers for drawing
  useEffect(() => {
    if (!map.current) return;

    const mapInstance = map.current;

    mapInstance.on("click", handleMapClick);
    mapInstance.on("mousemove", handleMouseMove);
    mapInstance.on("contextmenu", handleContextMenu);
    mapInstance.on("dblclick", handleDblClick);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      mapInstance.off("click", handleMapClick);
      mapInstance.off("mousemove", handleMouseMove);
      mapInstance.off("contextmenu", handleContextMenu);
      mapInstance.off("dblclick", handleDblClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleMapClick, handleMouseMove, handleContextMenu, handleDblClick, handleKeyDown]);

  // Update cursor style based on drawing mode
  useEffect(() => {
    if (!map.current) return;

    if (drawingMode === "drawing") {
      map.current.getCanvas().style.cursor = "crosshair";
    } else {
      map.current.getCanvas().style.cursor = "";
    }
  }, [drawingMode]);

  // Update visualization when points change
  useEffect(() => {
    if (!map.current) return;
    updateDrawingVisualization(map.current, currentPoints);
  }, [currentPoints, updateDrawingVisualization]);

  // Clear visualization when drawing mode changes to none
  const prevDrawingModeRef = useRef<DrawingMode>("none");
  useEffect(() => {
    if (prevDrawingModeRef.current === "none" && drawingMode === "drawing") {
      resetNextPointRef.current = true;
    }

    if (prevDrawingModeRef.current === "drawing" && drawingMode === "none" && map.current) {
      clearDrawingVisualization(map.current);
    }
    prevDrawingModeRef.current = drawingMode;
  }, [drawingMode, clearDrawingVisualization]);

  // Handle resize
  useEffect(() => {
    if (!map.current) return;

    const resizeObserver = new ResizeObserver(() => {
      map.current?.resize();
    });

    if (mapContainer.current) {
      resizeObserver.observe(mapContainer.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className={`relative w-full h-full ${className}`}>
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
          <div className="text-center p-6">
            <p className="text-destructive font-medium">{mapError}</p>
          </div>
        </div>
      )}
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
}
