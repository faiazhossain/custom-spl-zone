"use client";

import { cn } from "@/lib/utils";
import { Pencil, X, Check } from "lucide-react";

interface DrawingControlsProps {
  isDrawing: boolean;
  isEditing?: boolean;
  pointCount: number;
  onStartDrawing: () => void;
  onCancelDrawing: () => void;
  onCompleteDrawing: () => void;
  disabled?: boolean;
}

export function DrawingControls({
  isDrawing,
  isEditing = false,
  pointCount,
  onStartDrawing,
  onCancelDrawing,
  onCompleteDrawing,
  disabled = false,
}: DrawingControlsProps) {
  const modeLabel = isEditing ? "Editing Mode" : "Drawing Mode";
  const modeColor = isEditing ? "bg-blue-500" : "bg-purple-500";
  const buttonText = isEditing ? "Save Changes" : "Done";

  if (isDrawing) {
    return (
      <div className='flex flex-col gap-2'>
        {/* Active Drawing Panel */}
        <div className='bg-card/95 backdrop-blur-sm rounded-lg shadow-lg border border-border p-3 min-w-[200px]'>
          <div className='flex items-center justify-between mb-3'>
            <span className='text-sm font-medium text-foreground'>
              {modeLabel}
            </span>
            <div className='flex items-center gap-1'>
              <div
                className={cn("w-2 h-2 rounded-full animate-pulse", modeColor)}
              />
              <span className='text-xs text-muted-foreground'>
                {pointCount} pts
              </span>
            </div>
          </div>

          <p className='text-xs text-muted-foreground mb-3'>
            {isEditing
              ? "Drag points to move, click edges to add, right-click point to remove"
              : pointCount < 3
                ? `Click to add points (${3 - pointCount} more required)`
                : "Click to add more points, or complete"}
          </p>

          <div className='flex gap-2'>
            <button
              onClick={onCancelDrawing}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2",
                "rounded-md text-sm font-medium",
                "bg-secondary text-secondary-foreground",
                "hover:bg-secondary/80",
                "transition-colors",
              )}
            >
              <X className='w-4 h-4' />
              Cancel
            </button>

            {pointCount >= 3 && (
              <button
                onClick={onCompleteDrawing}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-3 py-2",
                  "rounded-md text-sm font-medium",
                  "bg-primary text-primary-foreground",
                  "hover:bg-primary/90",
                  "transition-colors",
                )}
              >
                <Check className='w-4 h-4' />
                {buttonText}
              </button>
            )}
          </div>
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className='bg-card/80 backdrop-blur-sm rounded-lg shadow border border-border p-2'>
          <p className='text-xs text-muted-foreground'>
            <span className='font-mono bg-muted px-1 rounded'>Esc</span> Cancel
            {pointCount >= 3 && (
              <>
                {" "}
                <span className='font-mono bg-muted px-1 rounded'>
                  Enter
                </span>{" "}
                {isEditing ? "Save" : "Finish"}
              </>
            )}
            {isEditing && (
              <>
                {" "}
                <span className='font-mono bg-muted px-1 rounded'>
                  R-Click
                </span>{" "}
                Remove point
              </>
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onStartDrawing}
      disabled={disabled}
      aria-label='Draw zone'
      title='Draw zone'
      className={cn(
        "group flex items-center px-3 py-2",
        "rounded-lg shadow-lg border",
        "bg-card/95 backdrop-blur-sm",
        "text-foreground font-medium",
        "hover:bg-card hover:scale-105",
        "active:scale-95",
        "transition-all duration-200",
        disabled && "opacity-50 cursor-not-allowed hover:scale-100",
      )}
    >
      <Pencil className='w-4 h-4 text-purple-600' />
      <span
        className={cn(
          "max-w-0 overflow-hidden whitespace-nowrap opacity-0",
          "transition-all duration-200 ease-out",
          "group-hover:max-w-24 group-hover:opacity-100 group-hover:ml-2",
          disabled && "group-hover:max-w-0 group-hover:opacity-0",
        )}
      >
        Draw zone
      </span>
    </button>
  );
}
