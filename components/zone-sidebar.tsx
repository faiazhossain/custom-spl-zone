"use client";

import { Layers, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Zone } from "@/lib/types";
import { ZoneCard } from "./zone-card";

interface ZoneSidebarProps {
  zones: Zone[];
  selectedZoneId?: string | null;
  isMobileOpen?: boolean;
  isLoading?: boolean;
  loadError?: string | null;
  onRetryLoad?: () => void;
  actionsDisabled?: boolean;
  onCloseMobile?: () => void;
  onCreateZone?: () => void;
  onSelectZone?: (zone: Zone) => void;
  onEditZone?: (zone: Zone) => void;
  onDeleteZone?: (zone: Zone) => void;
  onDownloadZone?: (zone: Zone) => void;
}

export function ZoneSidebar({
  zones,
  selectedZoneId,
  isMobileOpen,
  isLoading = false,
  loadError,
  onRetryLoad,
  actionsDisabled = false,
  onCloseMobile,
  onCreateZone,
  onSelectZone,
  onEditZone,
  onDeleteZone,
  onDownloadZone,
}: ZoneSidebarProps) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className='fixed inset-0 bg-black/50 z-40 lg:hidden'
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:relative flex flex-col",
          "w-full sm:w-80 lg:w-96 h-full",
          "bg-card border-l border-border",
          "z-50 transition-transform duration-300 ease-in-out",
          "shadow-xl lg:shadow-none",
          isMobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0",
        )}
      >
        {/* Header */}
        <div className='flex items-center justify-between p-4 border-b border-border'>
          <div className='flex items-center gap-2'>
            <Layers className='w-5 h-5 text-purple-600' />
            <h2 className='text-lg font-semibold text-foreground'>
              Zones ({zones.length})
            </h2>
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={onCloseMobile}
            className='lg:hidden p-2 rounded-md hover:bg-muted transition-colors'
            aria-label='Close sidebar'
          >
            <svg
              className='w-5 h-5'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M6 18L18 6M6 6l12 12'
              />
            </svg>
          </button>
        </div>

        {/* Create Zone Button */}
        {onCreateZone && (
          <div className='p-4 border-b border-border'>
            <button
              onClick={onCreateZone}
              disabled={actionsDisabled}
              className={cn(
                "w-full flex items-center justify-center gap-2",
                "px-4 py-2.5 rounded-lg",
                "bg-purple-600 text-white",
                "hover:bg-purple-700",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-colors font-medium",
              )}
            >
              <Plus className='w-4 h-4' />
              Create New Zone
            </button>
          </div>
        )}

        {/* Zone List */}
        <div className='flex-1 overflow-y-auto p-4 space-y-2 zone-list'>
          {isLoading ? (
            <div className='flex items-center justify-center h-full text-center py-12'>
              <p className='text-sm text-muted-foreground'>Loading zones...</p>
            </div>
          ) : loadError ? (
            <div className='flex flex-col items-center justify-center h-full text-center py-12 gap-3'>
              <p className='text-sm text-destructive max-w-[240px]'>
                {loadError}
              </p>
              {onRetryLoad && (
                <button
                  onClick={onRetryLoad}
                  className='px-3 py-1.5 rounded-md text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors'
                >
                  Retry
                </button>
              )}
            </div>
          ) : zones.length === 0 ? (
            <div className='flex flex-col items-center justify-center h-full text-center py-12'>
              <div className='w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center mb-4'>
                <Layers className='w-8 h-8 text-purple-600' />
              </div>
              <p className='text-foreground font-medium mb-1'>No zones yet</p>
              <p className='text-sm text-muted-foreground max-w-[200px]'>
                Draw a polygon on the map to create your first zone
              </p>
            </div>
          ) : (
            zones.map((zone) => (
              <ZoneCard
                key={zone.id}
                zone={zone}
                isSelected={selectedZoneId === zone.id}
                onSelect={() => onSelectZone?.(zone)}
                onEdit={
                  actionsDisabled || !onEditZone
                    ? undefined
                    : () => onEditZone(zone)
                }
                onDelete={
                  actionsDisabled || !onDeleteZone
                    ? undefined
                    : () => onDeleteZone(zone)
                }
                onDownload={
                  actionsDisabled || !onDownloadZone
                    ? undefined
                    : () => onDownloadZone(zone)
                }
              />
            ))
          )}
        </div>
      </aside>
    </>
  );
}
