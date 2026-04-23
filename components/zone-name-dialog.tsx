"use client";

import { useState } from "react";
import { Dialog, DialogActions } from "./ui/dialog";
import { cn } from "@/lib/utils";

interface ZoneNameDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  defaultName?: string;
  title?: string;
  saveLabel?: string;
  isSaving?: boolean;
}

export function ZoneNameDialog({
  open,
  onClose,
  onSave,
  defaultName = "",
  title = "Name Your Zone",
  saveLabel = "Save",
  isSaving = false,
}: ZoneNameDialogProps) {
  const [zoneName, setZoneName] = useState(defaultName);

  const handleSave = () => {
    const trimmedName = zoneName.trim();
    if (trimmedName && !isSaving) {
      onSave(trimmedName);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && zoneName.trim() && !isSaving) {
      handleSave();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <div className='space-y-4'>
        <div>
          <label
            htmlFor='zone-name'
            className='block text-sm font-medium text-foreground mb-2'
          >
            Zone Name
          </label>
          <input
            id='zone-name'
            type='text'
            value={zoneName}
            onChange={(e) => setZoneName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Enter zone name...'
            disabled={isSaving}
            className={cn(
              "w-full px-3 py-2 rounded-md",
              "bg-background border border-input",
              "text-foreground placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring",
              "transition-colors",
            )}
            autoFocus
          />
        </div>

        <DialogActions>
          <button
            onClick={() => {
              if (!isSaving) onClose();
            }}
            disabled={isSaving}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium",
              "bg-secondary text-secondary-foreground",
              "hover:bg-secondary/80",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-colors",
            )}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!zoneName.trim() || isSaving}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium",
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-colors",
            )}
          >
            {isSaving ? "Saving..." : saveLabel}
          </button>
        </DialogActions>
      </div>
    </Dialog>
  );
}
