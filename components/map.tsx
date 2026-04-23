"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import * as turf from "@turf/turf";
import "maplibre-gl/dist/maplibre-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { DrawingMode } from "@/lib/types";

const DEFAULT_LNG = Number(process.env.NEXT_PUBLIC_DEFAULT_LNG) || 46.6753;
const DEFAULT_LAT = Number(process.env.NEXT_PUBLIC_DEFAULT_LAT) || 24.7136;
const DEFAULT_ZOOM = Number(process.env.NEXT_PUBLIC_DEFAULT_ZOOM) || 5;
const MIN_ZOOM = Number(process.env.NEXT_PUBLIC_MIN_ZOOM) || 4;
const MAX_ZOOM = Number(process.env.NEXT_PUBLIC_MAX_ZOOM) || 18;
const MAP_STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL || "";

const ZONES_SOURCE_ID = "zones-source";
const ZONES_LAYER_ID = "zones-layer";
const ZONES_HOVER_LAYER_ID = "zones-hover-layer";

interface ZoneFeature {
  id: string;
  zone_name: string;
  geometry: GeoJSON.Polygon;
}

interface MapProps {
  drawingMode: DrawingMode;
  startDrawingSignal?: number;
  editingCoordinates?: [number, number][] | null;
  onDrawingComplete?: (coordinates: [number, number][]) => void;
  onDrawingCancel?: () => void;
  onPointsChange?: (points: [number, number][]) => void;
  onAreaChange?: (squareMeters: number | null) => void;
  zones?: ZoneFeature[];
  selectedZoneId?: string | null;
  onZoneClick?: (zoneId: string) => void;
  className?: string;
}

const drawClassConstants = MapboxDraw.constants.classes as unknown as Record<
  string,
  string
>;
drawClassConstants.CANVAS = "maplibregl-canvas";
drawClassConstants.CONTROL_BASE = "maplibregl-ctrl";
drawClassConstants.CONTROL_PREFIX = "maplibregl-ctrl-";
drawClassConstants.CONTROL_GROUP = "maplibregl-ctrl-group";
drawClassConstants.ATTRIBUTION = "maplibregl-ctrl-attrib";

const drawStyles: object[] = [
  {
    id: "gl-draw-polygon-fill-inactive",
    type: "fill",
    filter: [
      "all",
      ["==", "active", "false"],
      ["==", "$type", "Polygon"],
      ["!=", "mode", "static"],
    ],
    paint: {
      "fill-color": "#3bb2d0",
      "fill-outline-color": "#3bb2d0",
      "fill-opacity": 0.1,
    },
  },
  {
    id: "gl-draw-polygon-fill-active",
    type: "fill",
    filter: ["all", ["==", "active", "true"], ["==", "$type", "Polygon"]],
    paint: {
      "fill-color": "#fbb03b",
      "fill-outline-color": "#fbb03b",
      "fill-opacity": 0.1,
    },
  },
  {
    id: "gl-draw-polygon-midpoint",
    type: "circle",
    filter: ["all", ["==", "$type", "Point"], ["==", "meta", "midpoint"]],
    paint: {
      "circle-radius": 3,
      "circle-color": "#fbb03b",
    },
  },
  {
    id: "gl-draw-polygon-stroke-inactive",
    type: "line",
    filter: [
      "all",
      ["==", "active", "false"],
      ["==", "$type", "Polygon"],
      ["!=", "mode", "static"],
    ],
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "#3bb2d0",
      "line-width": 2,
    },
  },
  {
    id: "gl-draw-polygon-stroke-active",
    type: "line",
    filter: ["all", ["==", "active", "true"], ["==", "$type", "Polygon"]],
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "#fbb03b",
      "line-dasharray": [0.2, 2],
      "line-width": 2,
    },
  },
  {
    id: "gl-draw-line-inactive",
    type: "line",
    filter: [
      "all",
      ["==", "active", "false"],
      ["==", "$type", "LineString"],
      ["!=", "mode", "static"],
    ],
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "#3bb2d0",
      "line-width": 2,
    },
  },
  {
    id: "gl-draw-line-active",
    type: "line",
    filter: ["all", ["==", "$type", "LineString"], ["==", "active", "true"]],
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "#fbb03b",
      "line-dasharray": [0.2, 2],
      "line-width": 2,
    },
  },
  {
    id: "gl-draw-polygon-and-line-vertex-stroke-inactive",
    type: "circle",
    filter: [
      "all",
      ["==", "meta", "vertex"],
      ["==", "$type", "Point"],
      ["!=", "mode", "static"],
    ],
    paint: {
      "circle-radius": 5,
      "circle-color": "#fff",
    },
  },
  {
    id: "gl-draw-polygon-and-line-vertex-inactive",
    type: "circle",
    filter: [
      "all",
      ["==", "meta", "vertex"],
      ["==", "$type", "Point"],
      ["!=", "mode", "static"],
    ],
    paint: {
      "circle-radius": 3,
      "circle-color": "#fbb03b",
    },
  },
  {
    id: "gl-draw-point-point-stroke-inactive",
    type: "circle",
    filter: [
      "all",
      ["==", "active", "false"],
      ["==", "$type", "Point"],
      ["==", "meta", "feature"],
      ["!=", "mode", "static"],
    ],
    paint: {
      "circle-radius": 5,
      "circle-opacity": 1,
      "circle-color": "#fff",
    },
  },
  {
    id: "gl-draw-point-inactive",
    type: "circle",
    filter: [
      "all",
      ["==", "active", "false"],
      ["==", "$type", "Point"],
      ["==", "meta", "feature"],
      ["!=", "mode", "static"],
    ],
    paint: {
      "circle-radius": 3,
      "circle-color": "#3bb2d0",
    },
  },
  {
    id: "gl-draw-point-stroke-active",
    type: "circle",
    filter: [
      "all",
      ["==", "$type", "Point"],
      ["==", "active", "true"],
      ["!=", "meta", "midpoint"],
    ],
    paint: {
      "circle-radius": 7,
      "circle-color": "#fff",
    },
  },
  {
    id: "gl-draw-point-active",
    type: "circle",
    filter: [
      "all",
      ["==", "$type", "Point"],
      ["!=", "meta", "midpoint"],
      ["==", "active", "true"],
    ],
    paint: {
      "circle-radius": 5,
      "circle-color": "#fbb03b",
    },
  },
  {
    id: "gl-draw-polygon-fill-static",
    type: "fill",
    filter: ["all", ["==", "mode", "static"], ["==", "$type", "Polygon"]],
    paint: {
      "fill-color": "#404040",
      "fill-outline-color": "#404040",
      "fill-opacity": 0.1,
    },
  },
  {
    id: "gl-draw-polygon-stroke-static",
    type: "line",
    filter: ["all", ["==", "mode", "static"], ["==", "$type", "Polygon"]],
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "#404040",
      "line-width": 2,
    },
  },
  {
    id: "gl-draw-line-static",
    type: "line",
    filter: ["all", ["==", "mode", "static"], ["==", "$type", "LineString"]],
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "#404040",
      "line-width": 2,
    },
  },
  {
    id: "gl-draw-point-static",
    type: "circle",
    filter: ["all", ["==", "mode", "static"], ["==", "$type", "Point"]],
    paint: {
      "circle-radius": 5,
      "circle-color": "#404040",
    },
  },
];

function toFeatureCollection(
  zones: ZoneFeature[],
): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  return {
    type: "FeatureCollection",
    features: zones.map((zone) => ({
      type: "Feature",
      properties: {
        id: zone.id,
        name: zone.zone_name,
      },
      geometry: zone.geometry,
    })),
  };
}

function normalizePolygonCoordinates(
  coordinates: number[][],
): [number, number][] {
  const points = coordinates.map(
    (point) => [point[0], point[1]] as [number, number],
  );
  if (points.length === 0) return points;

  const first = points[0];
  const last = points[points.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) {
    points.pop();
  }
  return points;
}

function extractFirstPolygon(
  collection: GeoJSON.FeatureCollection,
): [number, number][] | null {
  const feature = collection.features.find(
    (f) => f.geometry && f.geometry.type === "Polygon",
  ) as GeoJSON.Feature<GeoJSON.Polygon> | undefined;

  if (!feature || !feature.geometry.coordinates[0]) {
    return null;
  }

  const points = normalizePolygonCoordinates(feature.geometry.coordinates[0]);
  return points.length >= 3 ? points : null;
}

export function Map({
  drawingMode,
  startDrawingSignal = 0,
  editingCoordinates = null,
  onDrawingComplete,
  onDrawingCancel,
  onPointsChange,
  onAreaChange,
  zones = [],
  selectedZoneId = null,
  onZoneClick,
  className = "",
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const drawingModeRef = useRef<DrawingMode>(drawingMode);
  const [mapError, setMapError] = useState<string | null>(
    MAP_STYLE_URL ? null : "Map style URL is not configured",
  );
  // Use refs for callbacks to avoid infinite loops
  const onPointsChangeRef = useRef(onPointsChange);
  const onAreaChangeRef = useRef(onAreaChange);
  const onDrawingCompleteRef = useRef(onDrawingComplete);
  const onDrawingCancelRef = useRef(onDrawingCancel);

  // Update refs when callbacks change
  useEffect(() => {
    onPointsChangeRef.current = onPointsChange;
  }, [onPointsChange]);
  useEffect(() => {
    onAreaChangeRef.current = onAreaChange;
  }, [onAreaChange]);
  useEffect(() => {
    onDrawingCompleteRef.current = onDrawingComplete;
  }, [onDrawingComplete]);
  useEffect(() => {
    onDrawingCancelRef.current = onDrawingCancel;
  }, [onDrawingCancel]);

  useEffect(() => {
    drawingModeRef.current = drawingMode;
  }, [drawingMode]);

  const updateZonesVisualization = useCallback(
    (mapInstance: MapLibreMap, zoneFeatures: ZoneFeature[]) => {
      const source = mapInstance.getSource(ZONES_SOURCE_ID) as
        | maplibregl.GeoJSONSource
        | undefined;
      if (!source) return;

      source.setData(toFeatureCollection(zoneFeatures));
    },
    [],
  );

  const updateSelectionStyles = useCallback(
    (mapInstance: MapLibreMap, selectedId: string | null) => {
      const selected = selectedId || "";

      if (mapInstance.getLayer(ZONES_LAYER_ID)) {
        mapInstance.setPaintProperty(ZONES_LAYER_ID, "fill-color", [
          "case",
          ["==", ["get", "id"], selected],
          "#9333ea",
          "#3b82f6",
        ]);
        mapInstance.setPaintProperty(ZONES_LAYER_ID, "fill-opacity", [
          "case",
          ["==", ["get", "id"], selected],
          0.4,
          0.2,
        ]);
      }

      if (mapInstance.getLayer(ZONES_HOVER_LAYER_ID)) {
        mapInstance.setPaintProperty(ZONES_HOVER_LAYER_ID, "line-color", [
          "case",
          ["==", ["get", "id"], selected],
          "#a855f7",
          "#60a5fa",
        ]);
        mapInstance.setPaintProperty(ZONES_HOVER_LAYER_ID, "line-width", [
          "case",
          ["==", ["get", "id"], selected],
          3,
          2,
        ]);
      }
    },
    [],
  );

  useEffect(() => {
    if (!mapContainer.current || map.current || !MAP_STYLE_URL) return;

    const mapInstance = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE_URL,
      center: [DEFAULT_LNG, DEFAULT_LAT],
      zoom: DEFAULT_ZOOM,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
    });

    mapInstance.addControl(new maplibregl.NavigationControl(), "top-right");
    mapInstance.addControl(new maplibregl.FullscreenControl(), "top-right");
    mapInstance.addControl(
      new maplibregl.ScaleControl({ maxWidth: 100, unit: "metric" }),
      "bottom-left",
    );

    mapInstance.on("load", () => {
      if (!mapInstance.getSource(ZONES_SOURCE_ID)) {
        mapInstance.addSource(ZONES_SOURCE_ID, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
      }

      if (!mapInstance.getLayer(ZONES_LAYER_ID)) {
        mapInstance.addLayer({
          id: ZONES_LAYER_ID,
          type: "fill",
          source: ZONES_SOURCE_ID,
          paint: {
            "fill-color": "#3b82f6",
            "fill-opacity": 0.2,
          },
        });
      }

      if (!mapInstance.getLayer(ZONES_HOVER_LAYER_ID)) {
        mapInstance.addLayer({
          id: ZONES_HOVER_LAYER_ID,
          type: "line",
          source: ZONES_SOURCE_ID,
          paint: {
            "line-color": "#60a5fa",
            "line-width": 2,
          },
        });
      }

      const drawInstance = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          polygon: true,
          trash: true,
        },
        styles: drawStyles,
      });
      draw.current = drawInstance;
      mapInstance.addControl(drawInstance, "top-right");

      // Set up draw event listeners directly here
      const syncDrawState = (eventType?: string) => {
        const all = drawInstance.getAll();
        const points = extractFirstPolygon(all) ?? [];
        console.log("[syncDrawState] eventType:", eventType, "drawingMode:", drawingModeRef.current, "points:", points.length);
        onPointsChangeRef.current?.(points);

        if (all.features.length > 0) {
          const roundedArea = Math.round(turf.area(all) * 100) / 100;
          onAreaChangeRef.current?.(roundedArea);
        } else {
          onAreaChangeRef.current?.(null);
        }

        if (
          eventType === "draw.create" &&
          drawingModeRef.current !== "editing" &&
          points.length >= 3
        ) {
          console.log("[syncDrawState] Calling onDrawingComplete with", points);
          onDrawingCompleteRef.current?.(points);
        }

        if (
          eventType === "draw.delete" &&
          drawingModeRef.current !== "none" &&
          all.features.length === 0
        ) {
          onDrawingCancelRef.current?.();
        }
      };

      const handleDrawCreate = () => {
        console.log("[handleDrawCreate] draw.create event fired!");
        syncDrawState("draw.create");
      };
      const handleDrawUpdate = () => syncDrawState("draw.update");
      const handleDrawDelete = () => syncDrawState("draw.delete");

      mapInstance.on("draw.create", handleDrawCreate);
      mapInstance.on("draw.update", handleDrawUpdate);
      mapInstance.on("draw.delete", handleDrawDelete);

      console.log("[EventListeners] Event listeners attached successfully");

      // Store cleanup function on the map instance for later use
      (mapInstance as any)._drawEventCleanup = () => {
        mapInstance.off("draw.create", handleDrawCreate);
        mapInstance.off("draw.update", handleDrawUpdate);
        mapInstance.off("draw.delete", handleDrawDelete);
      };

      updateZonesVisualization(mapInstance, zones);
      updateSelectionStyles(mapInstance, selectedZoneId);
    });

    mapInstance.on("error", (e) => {
      console.error("Map error:", e);
      setMapError("Failed to load map. Please try again.");
    });

    map.current = mapInstance;

    return () => {
      // Clean up draw event listeners before removing map
      if (map.current && (map.current as any)._drawEventCleanup) {
        (map.current as any)._drawEventCleanup();
      }
      map.current?.remove();
      map.current = null;
      draw.current = null;
    };
  }, [selectedZoneId, updateSelectionStyles, updateZonesVisualization, zones]);

  useEffect(() => {
    if (!map.current || !draw.current) return;
    const mapInstance = map.current;
    const drawInstance = draw.current;

    if (drawingMode === "drawing") {
      drawInstance.deleteAll();
      onPointsChange?.([]);
      onAreaChange?.(null);
      drawInstance.changeMode("draw_polygon");
      return;
    }

    if (
      drawingMode === "editing" &&
      editingCoordinates &&
      editingCoordinates.length >= 3
    ) {
      drawInstance.deleteAll();

      const closed = [...editingCoordinates, editingCoordinates[0]];
      const feature: GeoJSON.Feature<GeoJSON.Polygon> = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [closed],
        },
      };

      const added = drawInstance.add(feature);
      const featureId = Array.isArray(added) ? added[0] : added;
      onPointsChange?.(editingCoordinates);
      onAreaChange?.(Math.round(turf.area(feature) * 100) / 100);

      if (featureId) {
        drawInstance.changeMode("direct_select", {
          featureId: String(featureId),
        });
      } else {
        drawInstance.changeMode("simple_select");
      }
      return;
    }

    drawInstance.deleteAll();
    onPointsChange?.([]);
    onAreaChange?.(null);
    drawInstance.changeMode("simple_select");
    mapInstance.getCanvas().style.cursor = "";
  }, [
    drawingMode,
    startDrawingSignal,
    editingCoordinates,
    onAreaChange,
    onPointsChange,
  ]);

  useEffect(() => {
    if (!map.current) return;
    updateZonesVisualization(map.current, zones);
  }, [zones, updateZonesVisualization]);

  useEffect(() => {
    if (!map.current) return;
    updateSelectionStyles(map.current, selectedZoneId);
  }, [selectedZoneId, updateSelectionStyles]);

  useEffect(() => {
    if (!map.current || !onZoneClick) return;
    const mapInstance = map.current;

    const handleZoneLayerClick = (e: maplibregl.MapMouseEvent) => {
      if (drawingMode !== "none") return;
      const features = mapInstance.queryRenderedFeatures(e.point, {
        layers: [ZONES_LAYER_ID],
      });

      if (features.length > 0) {
        const id = features[0].properties?.id as string | undefined;
        if (id) onZoneClick(id);
      }
    };

    mapInstance.on("click", ZONES_LAYER_ID, handleZoneLayerClick);
    return () => {
      mapInstance.off("click", ZONES_LAYER_ID, handleZoneLayerClick);
    };
  }, [drawingMode, onZoneClick]);

  useEffect(() => {
    if (!map.current) return;
    const resizeObserver = new ResizeObserver(() => {
      map.current?.resize();
    });

    if (mapContainer.current) {
      resizeObserver.observe(mapContainer.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div className={`relative w-full h-full ${className}`}>
      {mapError && (
        <div className='absolute inset-0 flex items-center justify-center bg-muted z-10'>
          <div className='text-center p-6'>
            <p className='text-destructive font-medium'>{mapError}</p>
          </div>
        </div>
      )}
      <div ref={mapContainer} className='w-full h-full' />
    </div>
  );
}
