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
const ZONES_LAYER_ID = "zones-fill";
const ZONES_BORDER_LAYER_ID = "zones-border";
const SELECTED_ZONE_SOURCE_ID = "selected-zone-source";
const SELECTED_ZONE_LAYER_ID = "selected-zone-layer";

interface ZoneFeature {
  id: string;
  zone_name: string;
  geometry: GeoJSON.Polygon;
}

interface MapProps {
  drawingMode: DrawingMode;
  startDrawingSignal?: number;
  editingCoordinates?: [number, number][] | null;
  editingZoneId?: string | null;
  onDrawingComplete?: (coordinates: [number, number][]) => void;
  onDrawingCancel?: () => void;
  onPointsChange?: (points: [number, number][]) => void;
  onAreaChange?: (squareMeters: number | null) => void;
  zones?: ZoneFeature[];
  selectedZoneId?: string | null;
  zonePopup?: { zoneId: string; zoneName: string; lng: number; lat: number } | null;
  onZoneClick?: (zoneId: string, lngLat?: [number, number]) => void;
  onClosePopup?: () => void;
  onEditFromPopup?: (zoneId: string) => void;
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
      "fill-color": "#9333ea",
      "fill-outline-color": "#9333ea",
      "fill-opacity": 0.1,
    },
  },
  {
    id: "gl-draw-polygon-midpoint",
    type: "circle",
    filter: ["all", ["==", "$type", "Point"], ["==", "meta", "midpoint"]],
    paint: {
      "circle-radius": 3,
      "circle-color": "#9333ea",
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
      "line-color": "#9333ea",
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
      "line-color": "#9333ea",
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
      "circle-color": "#9333ea",
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
      "circle-color": "#9333ea",
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
      "circle-color": "#9333ea",
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
      "circle-color": "#9333ea",
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
      "circle-color": "#9333ea",
    },
  },
  {
    id: "gl-draw-polygon-fill-static",
    type: "fill",
    filter: ["all", ["==", "mode", "static"], ["==", "$type", "Polygon"]],
    paint: {
      "fill-color": "#3b82f6",
      "fill-outline-color": "#3b82f6",
      "fill-opacity": 0.2,
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
      "line-color": "#60a5fa",
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
  editingZoneId = null,
  onDrawingComplete,
  onDrawingCancel,
  onPointsChange,
  onAreaChange,
  zones = [],
  selectedZoneId = null,
  zonePopup = null,
  onZoneClick,
  onClosePopup,
  onEditFromPopup,
  className = "",
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const drawingModeRef = useRef<DrawingMode>(drawingMode);
  const mapLoadedRef = useRef(false);
  const [mapError, setMapError] = useState<string | null>(
    MAP_STYLE_URL ? null : "Map style URL is not configured",
  );
  // Use refs for callbacks to avoid infinite loops
  const onPointsChangeRef = useRef(onPointsChange);
  const onAreaChangeRef = useRef(onAreaChange);
  const onDrawingCompleteRef = useRef(onDrawingComplete);
  const onDrawingCancelRef = useRef(onDrawingCancel);
  const onClosePopupRef = useRef(onClosePopup);
  const onEditFromPopupRef = useRef(onEditFromPopup);

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
    onClosePopupRef.current = onClosePopup;
  }, [onClosePopup]);
  useEffect(() => {
    onEditFromPopupRef.current = onEditFromPopup;
  }, [onEditFromPopup]);

  useEffect(() => {
    drawingModeRef.current = drawingMode;
  }, [drawingMode]);

  const updateZonesInDraw = useCallback(
    (drawInstance: MapboxDraw, mapInstance: MapLibreMap, zoneFeatures: ZoneFeature[], selectedId: string | null, editingId: string | null = null) => {
      console.log("[updateZonesInDraw] zones:", zoneFeatures.length, "selectedId:", selectedId, "editingId:", editingId);

      try {
        // Remove static zone features from draw instance (they don't work properly anyway)
        const all = drawInstance.getAll();
        const staticFeatures = all.features.filter(
          (f) => f.id && String(f.id).startsWith("zone-")
        );
        staticFeatures.forEach((f) => {
          drawInstance.delete(f.id as string);
        });

        // Use a custom GeoJSON source for zones instead of draw instance
        const source = mapInstance.getSource(ZONES_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;

        if (!source) {
          console.log("[updateZonesInDraw] Creating zones source");
          mapInstance.addSource(ZONES_SOURCE_ID, {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
        }

        // Create zones fill layer if it doesn't exist
        if (!mapInstance.getLayer(ZONES_LAYER_ID)) {
          console.log("[updateZonesInDraw] Creating zones fill layer");
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

        // Create zones border layer if it doesn't exist
        if (!mapInstance.getLayer(ZONES_BORDER_LAYER_ID)) {
          console.log("[updateZonesInDraw] Creating zones border layer");
          mapInstance.addLayer({
            id: ZONES_BORDER_LAYER_ID,
            type: "line",
            source: ZONES_SOURCE_ID,
            paint: {
              "line-color": "#60a5fa",
              "line-width": 2,
            },
          });
        }

        // Update zones data (skip the one being edited)
        const zonesSource = mapInstance.getSource(ZONES_SOURCE_ID) as maplibregl.GeoJSONSource;
        const zonesToAdd = zoneFeatures.filter((z) => !editingId || z.id !== editingId);

        zonesSource.setData({
          type: "FeatureCollection",
          features: zonesToAdd.map((zone) => ({
            type: "Feature",
            id: zone.id,
            properties: {
              id: zone.id,
              name: zone.zone_name,
            },
            geometry: zone.geometry,
          })),
        });

        // Update selected zone highlight
        const selectedSource = mapInstance.getSource(SELECTED_ZONE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;

        if (selectedSource && selectedId && !editingId) {
          const selectedZone = zoneFeatures.find((z) => z.id === selectedId);
          if (selectedZone) {
            selectedSource.setData({
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  properties: {},
                  geometry: selectedZone.geometry,
                },
              ],
            });
          } else {
            selectedSource.setData({ type: "FeatureCollection", features: [] });
          }
        } else if (selectedSource) {
          selectedSource.setData({ type: "FeatureCollection", features: [] });
        }
      } catch (error) {
        console.error("[updateZonesInDraw] Error:", error);
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
      // Add source for selected zone highlight
      if (!mapInstance.getSource(SELECTED_ZONE_SOURCE_ID)) {
        mapInstance.addSource(SELECTED_ZONE_SOURCE_ID, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
      }

      // Add layer for selected zone highlight
      if (!mapInstance.getLayer(SELECTED_ZONE_LAYER_ID)) {
        mapInstance.addLayer({
          id: SELECTED_ZONE_LAYER_ID,
          type: "line",
          source: SELECTED_ZONE_SOURCE_ID,
          paint: {
            "line-color": "#9333ea",
            "line-width": 3,
            "line-opacity": 0.8,
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
      type ExtendedMap = MapLibreMap & { _drawEventCleanup?: () => void };
      (mapInstance as ExtendedMap)._drawEventCleanup = () => {
        mapInstance.off("draw.create", handleDrawCreate);
        mapInstance.off("draw.update", handleDrawUpdate);
        mapInstance.off("draw.delete", handleDrawDelete);
      };

      updateZonesInDraw(drawInstance, mapInstance, zones, selectedZoneId, editingZoneId);
      mapLoadedRef.current = true;
    });

    mapInstance.on("error", (e) => {
      console.error("Map error:", e);
      if (e && typeof e === "object" && "error" in e) {
        console.error("Map error details:", (e as { error: Error }).error);
      }
      setMapError("Failed to load map. Please try again.");
    });

    map.current = mapInstance;

    return () => {
      // Clean up draw event listeners before removing map
      type ExtendedMap = MapLibreMap & { _drawEventCleanup?: () => void };
      const currentMap = map.current as ExtendedMap | null;
      if (currentMap?._drawEventCleanup) {
        currentMap._drawEventCleanup();
      }
      map.current?.remove();
      map.current = null;
      draw.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (!draw.current || !map.current) return;
    updateZonesInDraw(draw.current, map.current, zones, selectedZoneId, editingZoneId);
  }, [zones, selectedZoneId, editingZoneId, updateZonesInDraw]);

  useEffect(() => {
    if (!map.current || !onZoneClick) return;
    const mapInstance = map.current;

    const handleZoneLayerClick = (e: maplibregl.MapMouseEvent) => {
      if (drawingMode !== "none") return;

      console.log("[handleZoneLayerClick] Map clicked at:", e.point, "lngLat:", [e.lngLat.lng, e.lngLat.lat]);

      const features = mapInstance.queryRenderedFeatures(e.point, {
        layers: [ZONES_LAYER_ID],
      });

      console.log("[handleZoneLayerClick] Features found:", features.length);

      if (features.length > 0) {
        const feature = features[0];
        const zoneId = String(feature.id || feature.properties?.id || "");
        console.log("[handleZoneLayerClick] Zone clicked:", zoneId);
        // Pass the click coordinates for positioning the popup
        onZoneClick(zoneId, [e.lngLat.lng, e.lngLat.lat]);
      }
    };

    // Only attach to the specific layer when it exists
    const setupClickListener = () => {
      if (mapInstance.getLayer(ZONES_LAYER_ID)) {
        console.log("[handleZoneLayerClick] Setting up click listener on zones layer");
        mapInstance.on("click", ZONES_LAYER_ID, handleZoneLayerClick);
        return true;
      }
      console.log("[handleZoneLayerClick] Zones layer not found yet");
      return false;
    };

    if (mapLoadedRef.current) {
      setupClickListener();
    } else {
      // Try again after a short delay if map isn't loaded yet
      const checkInterval = setInterval(() => {
        if (mapLoadedRef.current && setupClickListener()) {
          clearInterval(checkInterval);
        }
      }, 100);

      return () => clearInterval(checkInterval);
    }

    return () => {
      if (mapInstance.getLayer(ZONES_LAYER_ID)) {
        mapInstance.off("click", ZONES_LAYER_ID, handleZoneLayerClick);
      }
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

  // Handle zone popup
  useEffect(() => {
    console.log("[Map popup useEffect] zonePopup:", zonePopup, "drawingMode:", drawingMode);
    if (!map.current) return;
    const mapInstance = map.current;

    // Close existing popup
    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }

    // Show new popup if zonePopup is provided
    if (zonePopup && drawingMode === "none") {
      console.log("[Map popup useEffect] Creating popup at:", [zonePopup.lng, zonePopup.lat]);

      // Prevent popup from closing immediately on zone click
      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 8,
      });

      popup.setHTML(`
        <div style="
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(4px);
          border-radius: 6px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: system-ui, -apple-system, sans-serif;
        ">
          <span style="
            font-size: 13px;
            font-weight: 500;
            color: #1f2937;
            white-space: nowrap;
            max-width: 150px;
            overflow: hidden;
            text-overflow: ellipsis;
          ">${zonePopup.zoneName}</span>
          <button id="zone-edit-btn" style="
            padding: 6px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
            </svg>
          </button>
        </div>
      `);

      popup.setLngLat([zonePopup.lng, zonePopup.lat]);
      popup.addTo(mapInstance);
      popupRef.current = popup;

      console.log("[Map popup useEffect] Popup added to map");

      // Add event listener to the edit button
      const handleEditClick = (e: MouseEvent) => {
        e.stopPropagation();
        console.log("[Map popup] Edit button clicked for zone:", zonePopup.zoneId);
        onEditFromPopupRef.current?.(zonePopup.zoneId);
        onClosePopupRef.current?.();
      };

      // Use setTimeout to ensure the popup is rendered
      setTimeout(() => {
        const editBtn = document.getElementById("zone-edit-btn");
        console.log("[Map popup] Edit button found:", !!editBtn);
        if (editBtn) {
          editBtn.addEventListener("click", handleEditClick);
        }
      }, 0);

      // Close popup on map click (but not on zone layer click)
      const handlePopupClose = (e: maplibregl.MapMouseEvent & { originalEvent?: MouseEvent }) => {
        // Check if click was on a zone
        const features = mapInstance.queryRenderedFeatures(e.point, {
          layers: [ZONES_LAYER_ID],
        });
        if (features.length > 0) {
          // Clicked on a zone, don't close popup - the zone click handler will handle it
          return;
        }
        console.log("[Map popup] Map clicked (not on zone), closing popup");
        onClosePopupRef.current?.();
      };

      mapInstance.on("click", handlePopupClose);

      return () => {
        mapInstance.off("click", handlePopupClose);
        const editBtn = document.getElementById("zone-edit-btn");
        if (editBtn) {
          editBtn.removeEventListener("click", handleEditClick);
        }
        if (popupRef.current) {
          popupRef.current.remove();
          popupRef.current = null;
        }
      };
    }

    return () => {
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
    };
  }, [zonePopup, drawingMode]);

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
