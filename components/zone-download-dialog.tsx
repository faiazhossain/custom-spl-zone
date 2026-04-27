"use client";

import { useMemo } from "react";
import { Download } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Zone } from "@/lib/types";
import {
  extractZoneCoordinates,
  toLngLatList,
  toPolygonGeoJsonFeature,
  toPolygonWkt,
} from "@/lib/utils";

type DownloadFormat = "geojson" | "wkt" | "lnglat";

interface ZoneDownloadDialogProps {
  open: boolean;
  zone: Zone | null;
  onClose: () => void;
}

function sanitizeFileName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "zone"
  );
}

function getFormatPayload(
  format: DownloadFormat,
  zone: Zone,
  coordinates: [number, number][],
): { fileName: string; mimeType: string; content: string; label: string } {
  const baseName = sanitizeFileName(zone.zone_name);

  if (format === "geojson") {
    const feature = toPolygonGeoJsonFeature(coordinates, {
      zone_id: zone.id,
      zone_name: zone.zone_name,
    });

    return {
      fileName: `${baseName}.geojson`,
      mimeType: "application/geo+json;charset=utf-8",
      content: JSON.stringify(feature, null, 2),
      label: "GeoJSON",
    };
  }

  if (format === "wkt") {
    return {
      fileName: `${baseName}.wkt`,
      mimeType: "text/plain;charset=utf-8",
      content: toPolygonWkt(coordinates),
      label: "WKT",
    };
  }

  return {
    fileName: `${baseName}-lnglat.txt`,
    mimeType: "text/plain;charset=utf-8",
    content: toLngLatList(coordinates),
    label: "LngLat List",
  };
}

function downloadTextFile(fileName: string, mimeType: string, content: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ZoneDownloadDialog({
  open,
  zone,
  onClose,
}: ZoneDownloadDialogProps) {
  const coordinates = useMemo(() => {
    if (!zone) return null;
    return extractZoneCoordinates(zone.zone_geojson);
  }, [zone]);

  const canDownload = Boolean(zone && coordinates && coordinates.length >= 3);

  const handleDownload = (format: DownloadFormat) => {
    if (!zone || !coordinates || coordinates.length < 3) return;
    const payload = getFormatPayload(format, zone, coordinates);
    downloadTextFile(payload.fileName, payload.mimeType, payload.content);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={zone ? `Download ${zone.zone_name}` : "Download Polygon"}
      className='max-w-lg'
    >
      <div className='space-y-4'>
        <p className='text-sm text-muted-foreground'>
          Choose a format to download this zone polygon.
        </p>

        {!canDownload && (
          <div className='rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
            This zone geometry is invalid and cannot be exported.
          </div>
        )}

        <div className='grid gap-2'>
          <button
            type='button'
            onClick={() => handleDownload("geojson")}
            disabled={!canDownload}
            className='w-full flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left hover:bg-accent/40 transition-colors disabled:opacity-60 disabled:cursor-not-allowed'
          >
            <div>
              <p className='font-medium text-foreground'>GeoJSON Format</p>
              <p className='text-xs text-muted-foreground'>
                Feature object with polygon geometry and zone metadata
              </p>
            </div>
            <Download className='w-4 h-4 text-muted-foreground' />
          </button>

          <button
            type='button'
            onClick={() => handleDownload("wkt")}
            disabled={!canDownload}
            className='w-full flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left hover:bg-accent/40 transition-colors disabled:opacity-60 disabled:cursor-not-allowed'
          >
            <div>
              <p className='font-medium text-foreground'>WKT Format</p>
              <p className='text-xs text-muted-foreground'>
                POLYGON ((lng lat, ...)) representation
              </p>
            </div>
            <Download className='w-4 h-4 text-muted-foreground' />
          </button>

          <button
            type='button'
            onClick={() => handleDownload("lnglat")}
            disabled={!canDownload}
            className='w-full flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left hover:bg-accent/40 transition-colors disabled:opacity-60 disabled:cursor-not-allowed'
          >
            <div>
              <p className='font-medium text-foreground'>LngLat List Format</p>
              <p className='text-xs text-muted-foreground'>
                One line per coordinate: lng,lat
              </p>
            </div>
            <Download className='w-4 h-4 text-muted-foreground' />
          </button>
        </div>
      </div>
    </Dialog>
  );
}
