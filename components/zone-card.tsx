"use client";

import { MapPin, Edit, Trash2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Zone } from "@/lib/types";

interface ZoneCardProps {
  zone: Zone;
  isSelected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDownload?: () => void;
}

export function ZoneCard({
  zone,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onDownload,
}: ZoneCardProps) {
  return (
    <div
      className={cn(
        "p-3 rounded-lg border transition-all cursor-pointer group",
        "bg-card hover:bg-accent/50",
        isSelected ? "border-primary ring-1 ring-primary" : "border-border",
      )}
      onClick={onSelect}
    >
      <div className='flex items-start justify-between gap-2'>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2'>
            <MapPin className='w-4 h-4 text-purple-600 shrink-0' />
            <h3 className='font-medium text-foreground truncate'>
              {zone.zone_name}
            </h3>
          </div>
          <p className='text-xs text-muted-foreground mt-1'>
            {zone.created_at
              ? new Date(zone.created_at).toLocaleDateString()
              : "No date"}
          </p>
        </div>

        <div className='flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
          {onDownload && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownload();
              }}
              className={cn(
                "p-1.5 rounded-md",
                "hover:bg-blue-100 hover:text-blue-700",
                "text-muted-foreground transition-colors",
                "dark:hover:bg-blue-900/30",
              )}
              aria-label='Download zone'
            >
              <Download className='w-3.5 h-3.5' />
            </button>
          )}
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className={cn(
                "p-1.5 rounded-md",
                "hover:bg-purple-100 hover:text-purple-700",
                "text-muted-foreground transition-colors",
                "dark:hover:bg-purple-900/30",
              )}
              aria-label='Edit zone'
            >
              <Edit className='w-3.5 h-3.5' />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className={cn(
                "p-1.5 rounded-md",
                "hover:bg-red-100 hover:text-red-700",
                "text-muted-foreground transition-colors",
                "dark:hover:bg-red-900/30",
              )}
              aria-label='Delete zone'
            >
              <Trash2 className='w-3.5 h-3.5' />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
