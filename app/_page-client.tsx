"use client";

import { useCallback, useEffect, useState } from "react";
import { Map } from "@/components/map";
import { ZoneSidebar } from "@/components/zone-sidebar";
import { ZoneNameDialog } from "@/components/zone-name-dialog";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { ZoneDownloadDialog } from "@/components/zone-download-dialog";
import { DrawingMode, Zone } from "@/lib/types";
import { api, setApiKey } from "@/lib/api";
import { toast } from "sonner";
import { Menu } from "lucide-react";

interface ClientPageProps {
  apiKey: string;
}

function toPolygonWkt(coordinates: [number, number][]) {
  const closed = [...coordinates, coordinates[0]];
  return `POLYGON ((${closed.map(([lng, lat]) => `${lng} ${lat}`).join(", ")}))`;
}

function parseWktPolygon(wkt: string): [number, number][] | null {
  try {
    const match = wkt.match(/POLYGON\s*\(\((.*?)\)\)/i);
    if (!match) return null;

    const coordsString = match[1];
    const pairs = coordsString.split(",").map((s) => s.trim());
    const coordinates: [number, number][] = [];

    for (const pair of pairs) {
      const parts = pair.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        const lng = parseFloat(parts[0]);
        const lat = parseFloat(parts[1]);
        if (!isNaN(lng) && !isNaN(lat)) {
          coordinates.push([lng, lat]);
        }
      }
    }

    // Remove duplicate closing point if present
    if (coordinates.length > 0) {
      const first = coordinates[0];
      const last = coordinates[coordinates.length - 1];
      if (first[0] === last[0] && first[1] === last[1]) {
        coordinates.pop();
      }
    }

    return coordinates.length >= 3 ? coordinates : null;
  } catch {
    return null;
  }
}

// Extract coordinates from zone_geojson (handles both JSON string and WKT formats)
function extractZoneCoordinates(
  zoneGeojson: string,
): [number, number][] | null {
  const geoString = zoneGeojson.trim();

  // Try parsing as JSON string first (e.g., "{\"type\":\"Polygon\",\"coordinates\":[...]}")
  if (geoString.startsWith("{") || geoString.startsWith("[")) {
    try {
      const parsed = JSON.parse(geoString) as GeoJSON.Geometry;
      if (parsed.type === "Polygon") {
        const coords = parsed.coordinates[0]; // First ring of the polygon
        // GeoJSON polygons are closed (first point = last point), remove duplicate
        if (coords.length >= 4) {
          const first = coords[0];
          const last = coords[coords.length - 1];
          if (first[0] === last[0] && first[1] === last[1]) {
            coords.pop();
          }
          return coords.length >= 3 ? (coords as [number, number][]) : null;
        }
      }
    } catch {
      // Fall through to WKT parsing
    }
  }

  // Try parsing as WKT format (e.g., "POLYGON ((lng lat, ...))")
  return parseWktPolygon(geoString);
}

function parseZoneGeojson(
  zone: Zone,
): { id: string; zone_name: string; geometry: GeoJSON.Polygon } | null {
  const geoString = zone.zone_geojson;

  // Try parsing as JSON string first (API returns GeoJSON as a string like "{\"type\":\"Polygon\",...}")
  if (geoString.startsWith("{") || geoString.startsWith("[")) {
    try {
      const parsed = JSON.parse(geoString) as GeoJSON.Geometry;
      if (parsed.type === "Polygon") {
        return {
          id: zone.id,
          zone_name: zone.zone_name,
          geometry: parsed,
        };
      }
    } catch {
      // JSON parse failed, fall through to WKT parsing
    }
  }

  // Try parsing as WKT format: POLYGON ((lng1 lat1, lng2 lat2, ...))
  const coordinates = parseWktPolygon(geoString);
  if (coordinates && coordinates.length >= 3) {
    // GeoJSON Polygon requires closed ring (first point = last point)
    const closedRing = [...coordinates, coordinates[0]];
    return {
      id: zone.id,
      zone_name: zone.zone_name,
      geometry: {
        type: "Polygon",
        coordinates: [closedRing],
      },
    };
  }

  console.error("Failed to parse zone_geojson for zone:", zone.id, geoString);
  return null;
}

export default function Home({ apiKey }: ClientPageProps) {
  // Set the validated API key for all API calls
  useEffect(() => {
    setApiKey(apiKey);
  }, [apiKey]);

  const [drawingMode, setDrawingMode] = useState<DrawingMode>("none");
  const [startDrawingSignal, setStartDrawingSignal] = useState(0);
  const [currentPoints, setCurrentPoints] = useState<[number, number][]>([]);
  const [currentAreaSqm, setCurrentAreaSqm] = useState<number | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [isLoadingZones, setIsLoadingZones] = useState(true);
  const [zonesLoadError, setZonesLoadError] = useState<string | null>(null);
  const [isSavingZone, setIsSavingZone] = useState(false);
  const [isDeletingZone, setIsDeletingZone] = useState(false);

  // Dialog states
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [pendingZone, setPendingZone] = useState<[number, number][] | null>(
    null,
  );
  const [zoneToDelete, setZoneToDelete] = useState<Zone | null>(null);
  const [zoneToDownload, setZoneToDownload] = useState<Zone | null>(null);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [editingZoneInitialName, setEditingZoneInitialName] =
    useState<string>("");
  const [editingSeedCoordinates, setEditingSeedCoordinates] = useState<
    [number, number][] | null
  >(null);

  // Mobile sidebar state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  // Zone popup state
  const [zonePopup, setZonePopup] = useState<{
    zoneId: string;
    zoneName: string;
    lng: number;
    lat: number;
  } | null>(null);

  // Handler for closing popup
  const handleClosePopup = useCallback(() => {
    setZonePopup(null);
  }, []);

  const fetchZones = useCallback(async () => {
    const response = await api.getZones();

    if (response.error) {
      setZonesLoadError(response.error);
      toast.error(`Failed to load zones: ${response.error}`);
      setIsLoadingZones(false);
      return;
    }

    const loadedZones = response.data ?? [];
    console.log("Loaded zones:", loadedZones.length, loadedZones);
    setZones(loadedZones);
    setIsLoadingZones(false);
  }, []);

  const loadZones = useCallback(async () => {
    setIsLoadingZones(true);
    setZonesLoadError(null);
    await fetchZones();
  }, [fetchZones]);

  // Fetch zones on mount
  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void fetchZones();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [fetchZones]);

  const handleStartDrawing = useCallback(() => {
    setStartDrawingSignal((prev) => prev + 1);
    setDrawingMode("drawing");
    setCurrentPoints([]);
    setCurrentAreaSqm(null);
    setEditingSeedCoordinates(null);
    setIsMobileSidebarOpen(false);
    toast.info("Drawing mode activated. Use the polygon tool on the map.");
  }, []);

  const handleCancelDrawing = useCallback(() => {
    setDrawingMode("none");
    setCurrentPoints([]);
    setCurrentAreaSqm(null);
    setEditingZone(null);
    setEditingSeedCoordinates(null);
    setEditingZoneInitialName("");
    toast.info(
      drawingMode === "editing" ? "Editing cancelled." : "Drawing cancelled.",
    );
  }, [drawingMode]);

  const handleSaveZone = useCallback(
    async (name: string) => {
      if (!pendingZone) return;

      setIsSavingZone(true);
      const payload = {
        zone_name: name,
        zone_geojson: toPolygonWkt(pendingZone),
      };

      const response = await api.createZone(payload);

      if (response.error) {
        toast.error(`Failed to create zone: ${response.error}`);
        setIsSavingZone(false);
        return;
      }

      // Refresh zones list from server since API doesn't return the created zone with ID
      await fetchZones();

      setDrawingMode("none");
      setCurrentPoints([]);
      setCurrentAreaSqm(null);
      setPendingZone(null);
      setShowNameDialog(false);
      setIsSavingZone(false);
      toast.success(`Zone "${name}" created successfully!`);
    },
    [pendingZone, fetchZones],
  );

  const handleSaveEditedZone = useCallback(async () => {
    if (!editingZone || currentPoints.length < 3) {
      toast.error("At least 3 points are required");
      return;
    }

    setIsSavingZone(true);
    const payload = {
      zone_name: editingZoneInitialName,
      zone_geojson: toPolygonWkt(currentPoints),
    };

    const response = await api.updateZone(editingZone.id, payload);

    if (response.error) {
      toast.error(`Failed to update zone: ${response.error}`);
      setIsSavingZone(false);
      return;
    }

    // Keep the selected zone ID to highlight after refresh
    const zoneIdToSelect = editingZone.id;

    // Refresh zones list from server
    await fetchZones();

    setSelectedZoneId(zoneIdToSelect);
    setDrawingMode("none");
    setCurrentPoints([]);
    setCurrentAreaSqm(null);
    setEditingZone(null);
    setEditingSeedCoordinates(null);
    setEditingZoneInitialName("");
    setIsSavingZone(false);
    toast.success(`Zone "${editingZoneInitialName}" updated successfully!`);
  }, [editingZone, editingZoneInitialName, currentPoints, fetchZones]);

  const handleCompleteDrawing = useCallback(
    (coordinates: [number, number][]) => {
      console.log(
        "[handleCompleteDrawing] Called with coordinates:",
        coordinates,
      );
      if (!editingZone) {
        setPendingZone(coordinates);
        setShowNameDialog(true);
        console.log("[handleCompleteDrawing] Name dialog should show now");
      }
    },
    [editingZone],
  );

  const handleSelectZone = useCallback((zone: Zone) => {
    setSelectedZoneId(zone.id);
    // TODO: Fit map to zone bounds
  }, []);

  const handleZoneClick = useCallback(
    (zoneId: string, lngLat?: [number, number]) => {
      console.log("[handleZoneClick] zoneId:", zoneId, "lngLat:", lngLat, "drawingMode:", drawingMode);
      setSelectedZoneId(zoneId);
      // Show popup at the click location for UX-friendly editing
      if (lngLat && drawingMode === "none") {
        const zone = zones.find((z) => z.id === zoneId);
        if (zone) {
          const popupData = {
            zoneId,
            zoneName: zone.zone_name,
            lng: lngLat[0],
            lat: lngLat[1],
          };
          console.log("[handleZoneClick] Setting zonePopup:", popupData);
          setZonePopup(popupData);
        }
      }
    },
    [zones, drawingMode],
  );

  const handleEditZone = useCallback(
    (zone: Zone) => {
      if (isSavingZone || isDeletingZone) return;

      // Parse the existing polygon geometry to get coordinates (handles both JSON and WKT)
      const coordinates = extractZoneCoordinates(zone.zone_geojson);
      if (!coordinates) {
        toast.error("Could not parse zone geometry for editing");
        return;
      }

      setEditingZone(zone);
      setEditingZoneInitialName(zone.zone_name);
      setCurrentPoints(coordinates);
      setCurrentAreaSqm(null);
      setEditingSeedCoordinates(coordinates);
      setDrawingMode("editing");
      setIsMobileSidebarOpen(false);
      toast.info(
        "Editing mode activated. Adjust vertices with map draw tools, then save.",
      );
    },
    [isDeletingZone, isSavingZone],
  );

  // Handler for editing from popup
  const handleEditFromPopup = useCallback(
    (zoneId: string) => {
      const zone = zones.find((z) => z.id === zoneId);
      if (zone) {
        setZonePopup(null); // Close popup first
        handleEditZone(zone);
      }
    },
    [zones, handleEditZone],
  );

  const handleUpdateZoneName = useCallback(
    async (name: string) => {
      if (!editingZone) return;

      setIsSavingZone(true);
      const response = await api.updateZone(editingZone.id, {
        zone_name: name,
        zone_geojson: editingZone.zone_geojson,
      });

      if (response.error) {
        toast.error(`Failed to rename zone: ${response.error}`);
        setIsSavingZone(false);
        return;
      }

      const updatedZone = response.data ?? {
        ...editingZone,
        zone_name: name,
      };

      setZones((prev) =>
        prev.map((z) => (z.id === editingZone.id ? updatedZone : z)),
      );
      setEditingZone(null);
      setShowNameDialog(false);
      setIsSavingZone(false);
      toast.success(`Zone renamed to "${name}"`);
    },
    [editingZone],
  );

  const handleDeleteClick = useCallback(
    (zone: Zone) => {
      if (isSavingZone || isDeletingZone) return;
      setZoneToDelete(zone);
      setShowDeleteDialog(true);
    },
    [isDeletingZone, isSavingZone],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!zoneToDelete) return;

    setIsDeletingZone(true);
    const response = await api.deleteZone(zoneToDelete.id);

    if (response.error) {
      toast.error(`Failed to delete zone: ${response.error}`);
      setIsDeletingZone(false);
      return;
    }

    // Refresh zones list from server
    await fetchZones();

    if (selectedZoneId === zoneToDelete.id) {
      setSelectedZoneId(null);
    }
    setShowDeleteDialog(false);
    setZoneToDelete(null);
    setIsDeletingZone(false);
    toast.success(`Zone "${zoneToDelete.zone_name}" deleted.`);
  }, [zoneToDelete, selectedZoneId, fetchZones]);

  const handleDownloadZone = useCallback(
    (zone: Zone) => {
      setZoneToDownload(zone);
      setShowDownloadDialog(true);
    },
    [],
  );

  const closeDownloadDialog = useCallback(() => {
    setShowDownloadDialog(false);
    setZoneToDownload(null);
  }, []);

  const handlePointsChange = useCallback((points: [number, number][]) => {
    setCurrentPoints(points);
  }, []);

  const handleAreaChange = useCallback((squareMeters: number | null) => {
    setCurrentAreaSqm(squareMeters);
  }, []);

  const closeNameDialog = useCallback(() => {
    setShowNameDialog(false);
    setPendingZone(null);
    setEditingZone(null);
    setDrawingMode("none");
    setCurrentPoints([]);
    setCurrentAreaSqm(null);
    setEditingSeedCoordinates(null);
  }, []);

  return (
    <div className='flex h-screen w-full overflow-hidden bg-background'>
      {/* Map Container */}
      <div className='flex-1 h-full relative'>
        <Map
          drawingMode={drawingMode}
          startDrawingSignal={startDrawingSignal}
          editingCoordinates={
            drawingMode === "editing" ? editingSeedCoordinates : null
          }
          editingZoneId={drawingMode === "editing" ? editingZone?.id : null}
          onDrawingComplete={handleCompleteDrawing}
          onDrawingCancel={handleCancelDrawing}
          onPointsChange={handlePointsChange}
          onAreaChange={handleAreaChange}
          zones={zones.map(parseZoneGeojson).filter(
            (
              z,
            ): z is {
              id: string;
              zone_name: string;
              geometry: GeoJSON.Polygon;
            } => z !== null,
          )}
          selectedZoneId={selectedZoneId}
          zonePopup={zonePopup}
          onZoneClick={handleZoneClick}
          onClosePopup={handleClosePopup}
          onEditFromPopup={handleEditFromPopup}
        />

        {/* Header Overlay */}
        <div className='absolute top-4 left-4 z-10 flex items-center gap-3'>
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className='lg:hidden p-2 rounded-lg bg-card/90 backdrop-blur-sm shadow-sm border border-border hover:bg-card transition-colors'
            aria-label='Open sidebar'
          >
            <Menu className='w-5 h-5 text-foreground' />
          </button>

          <div>
            <h1 className='text-xl sm:text-2xl font-bold text-foreground bg-card/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-sm border border-border'>
              Custom Zone - SPL
            </h1>
            <p className='text-sm text-muted-foreground bg-card/90 backdrop-blur-sm px-4 py-1 rounded-b-lg shadow-sm border border-t-0 border-border'>
              Draw and manage custom polygon zones
            </p>
          </div>
        </div>

        {/* Edit Actions */}
        {drawingMode === "editing" && (
          <div className='absolute top-4 right-16 z-10 flex gap-2'>
            <button
              onClick={handleCancelDrawing}
              disabled={isSavingZone}
              className='px-3 py-2 rounded-lg bg-card/95 backdrop-blur-sm border border-border shadow-sm hover:bg-card transition-colors text-sm font-medium disabled:opacity-60'
            >
              Cancel
            </button>
            <button
              onClick={() => void handleSaveEditedZone()}
              disabled={isSavingZone || currentPoints.length < 3}
              className='px-3 py-2 rounded-lg bg-red-600 text-white shadow-sm hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-60'
            >
              Save Changes
            </button>
          </div>
        )}

        {/* Instructions Overlay */}
        <div className='absolute bottom-4 left-4 z-10 hidden sm:block'>
          <div className='bg-card/90 backdrop-blur-sm px-4 py-3 rounded-lg shadow-sm border border-border max-w-sm'>
            <p className='text-sm text-foreground font-medium mb-1'>
              {drawingMode === "editing" ? "How to edit:" : "How to draw:"}
            </p>
            <ul className='text-sm text-muted-foreground space-y-1'>
              {drawingMode === "editing" ? (
                <>
                  <li>Drag vertices directly on the polygon</li>
                  <li>Click midpoints to add new vertices</li>
                  <li>Use trash tool or Delete key to remove selection</li>
                  <li>Use Save Changes button when done</li>
                </>
              ) : (
                <>
                  <li>Use the polygon tool at top-right of the map</li>
                  <li>
                    Click to place vertices and click first point to finish
                  </li>
                  <li>Name and save after the polygon is completed</li>
                </>
              )}
              <li>
                Use <kbd className='font-mono bg-muted px-1 rounded'>trash</kbd>{" "}
                or cancel actions to reset
              </li>
            </ul>
          </div>
        </div>

        {/* Drawing Status Banner */}
        {(drawingMode === "drawing" || drawingMode === "editing") &&
          currentPoints.length > 0 && (
            <div className='absolute bottom-4 right-4 z-10'>
              <div
                className={
                  drawingMode === "editing"
                    ? "bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg"
                    : "bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg"
                }
              >
                <span className='font-medium'>
                  {currentPoints.length} points
                </span>
                {currentAreaSqm !== null && currentPoints.length >= 3 && (
                  <span className='ml-2 opacity-90'>
                    ({currentAreaSqm.toLocaleString()} sq m)
                  </span>
                )}
                {currentPoints.length < 3 && (
                  <span className='ml-2 opacity-80'>
                    ({3 - currentPoints.length} more needed)
                  </span>
                )}
              </div>
            </div>
          )}
      </div>

      {/* Zone Sidebar */}
      <ZoneSidebar
        zones={zones}
        selectedZoneId={selectedZoneId}
        isMobileOpen={isMobileSidebarOpen}
        isLoading={isLoadingZones}
        loadError={zonesLoadError}
        onRetryLoad={loadZones}
        actionsDisabled={isSavingZone || isDeletingZone}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onCreateZone={handleStartDrawing}
        onSelectZone={handleSelectZone}
        onEditZone={handleEditZone}
        onDeleteZone={handleDeleteClick}
        onDownloadZone={handleDownloadZone}
      />

      {/* Zone Name Dialog */}
      <ZoneNameDialog
        key={editingZone?.id ?? (showNameDialog ? "new-zone" : "closed")}
        open={showNameDialog}
        onClose={closeNameDialog}
        onSave={editingZone ? handleUpdateZoneName : handleSaveZone}
        defaultName={editingZone?.zone_name || ""}
        title={editingZone ? "Rename Zone" : "Name Your Zone"}
        saveLabel={editingZone ? "Update" : "Save"}
        isSaving={isSavingZone}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={showDeleteDialog}
        onClose={() => {
          if (isDeletingZone) return;
          setShowDeleteDialog(false);
          setZoneToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        zoneName={zoneToDelete?.zone_name}
        isDeleting={isDeletingZone}
      />

      {/* Zone Download Dialog */}
      <ZoneDownloadDialog
        open={showDownloadDialog}
        zone={zoneToDownload}
        onClose={closeDownloadDialog}
      />
    </div>
  );
}
