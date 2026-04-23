"use client";

import { useCallback, useState } from "react";
import { Map } from "@/components/map";
import { DrawingControls } from "@/components/drawing-controls";
import { ZoneSidebar } from "@/components/zone-sidebar";
import { ZoneNameDialog } from "@/components/zone-name-dialog";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { DrawingMode, Zone } from "@/lib/types";
import { toast } from "sonner";
import { Menu } from "lucide-react";

export default function Home() {
  const [drawingMode, setDrawingMode] = useState<DrawingMode>("none");
  const [currentPoints, setCurrentPoints] = useState<[number, number][]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  // Dialog states
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pendingZone, setPendingZone] = useState<[number, number][] | null>(
    null,
  );
  const [zoneToDelete, setZoneToDelete] = useState<Zone | null>(null);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);

  // Mobile sidebar state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleStartDrawing = useCallback(() => {
    setDrawingMode("drawing");
    setCurrentPoints([]);
    setIsMobileSidebarOpen(false);
    toast.info("Drawing mode activated. Click on the map to place points.");
  }, []);

  const handleCancelDrawing = useCallback(() => {
    setDrawingMode("none");
    setCurrentPoints([]);
    toast.info("Drawing cancelled.");
  }, []);

  const handleCompleteDrawing = useCallback(
    (coordinates: [number, number][]) => {
      setPendingZone(coordinates);
      setShowNameDialog(true);
    },
    [],
  );

  const handleSaveZone = useCallback(
    (name: string) => {
      if (!pendingZone) return;

      const newZone: Zone = {
        id: Date.now().toString(),
        zone_name: name,
        zone_geojson: `POLYGON ((${pendingZone.map(([lng, lat]) => `${lng} ${lat}`).join(", ")}))`,
        created_at: new Date().toISOString(),
      };

      setZones((prev) => [...prev, newZone]);
      setDrawingMode("none");
      setCurrentPoints([]);
      setPendingZone(null);
      setShowNameDialog(false);
      toast.success(`Zone "${name}" created successfully!`);
    },
    [pendingZone],
  );

  const handleSelectZone = useCallback((zone: Zone) => {
    setSelectedZoneId(zone.id);
    // TODO: Fit map to zone bounds
  }, []);

  const handleEditZone = useCallback((zone: Zone) => {
    setEditingZone(zone);
    setShowNameDialog(true);
  }, []);

  const handleUpdateZoneName = useCallback(
    (name: string) => {
      if (!editingZone) return;

      setZones((prev) =>
        prev.map((z) =>
          z.id === editingZone.id ? { ...z, zone_name: name } : z,
        ),
      );
      setEditingZone(null);
      setShowNameDialog(false);
      toast.success(`Zone renamed to "${name}"`);
    },
    [editingZone],
  );

  const handleDeleteClick = useCallback((zone: Zone) => {
    setZoneToDelete(zone);
    setShowDeleteDialog(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!zoneToDelete) return;

    setZones((prev) => prev.filter((z) => z.id !== zoneToDelete.id));
    if (selectedZoneId === zoneToDelete.id) {
      setSelectedZoneId(null);
    }
    setShowDeleteDialog(false);
    setZoneToDelete(null);
    toast.success(`Zone "${zoneToDelete.zone_name}" deleted.`);
  }, [zoneToDelete, selectedZoneId]);

  const handlePointsChange = useCallback((points: [number, number][]) => {
    setCurrentPoints(points);
  }, []);

  const closeNameDialog = useCallback(() => {
    setShowNameDialog(false);
    setPendingZone(null);
    setEditingZone(null);
  }, []);

  return (
    <div className='flex h-screen w-full overflow-hidden bg-background'>
      {/* Map Container */}
      <div className='flex-1 h-full relative'>
        <Map
          drawingMode={drawingMode}
          onDrawingComplete={handleCompleteDrawing}
          onDrawingCancel={handleCancelDrawing}
          onPointsChange={handlePointsChange}
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
              SPL Custom Zone - Saudi Arabia
            </h1>
            <p className='text-sm text-muted-foreground bg-card/90 backdrop-blur-sm px-4 py-1 rounded-b-lg shadow-sm border border-t-0 border-border'>
              Draw and manage custom polygon zones
            </p>
          </div>
        </div>

        {/* Drawing Controls */}
        <div className='absolute top-[150px] right-2 z-10'>
          <DrawingControls
            isDrawing={drawingMode === "drawing"}
            pointCount={currentPoints.length}
            onStartDrawing={handleStartDrawing}
            onCancelDrawing={handleCancelDrawing}
            onCompleteDrawing={() => {
              if (currentPoints.length >= 3) {
                handleCompleteDrawing(currentPoints);
              }
            }}
          />
        </div>

        {/* Instructions Overlay */}
        <div className='absolute bottom-4 left-4 z-10 hidden sm:block'>
          <div className='bg-card/90 backdrop-blur-sm px-4 py-3 rounded-lg shadow-sm border border-border max-w-sm'>
            <p className='text-sm text-foreground font-medium mb-1'>
              How to draw:
            </p>
            <ul className='text-sm text-muted-foreground space-y-1'>
              <li>Click to place polygon vertices</li>
              <li>Add at least 3 points to complete</li>
              <li>
                Press{" "}
                <kbd className='font-mono bg-muted px-1 rounded'>Enter</kbd> or
                right-click to finish
              </li>
              <li>
                Press <kbd className='font-mono bg-muted px-1 rounded'>Esc</kbd>{" "}
                to cancel
              </li>
            </ul>
          </div>
        </div>

        {/* Drawing Status Banner */}
        {drawingMode === "drawing" && currentPoints.length > 0 && (
          <div className='absolute bottom-4 right-4 z-10'>
            <div className='bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg'>
              <span className='font-medium'>{currentPoints.length} points</span>
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
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onCreateZone={handleStartDrawing}
        onSelectZone={handleSelectZone}
        onEditZone={handleEditZone}
        onDeleteZone={handleDeleteClick}
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
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setZoneToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        zoneName={zoneToDelete?.zone_name}
      />
    </div>
  );
}
