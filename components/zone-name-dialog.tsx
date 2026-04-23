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
}

export function ZoneNameDialog({
  open,
  onClose,
  onSave,
  defaultName = "",
  title = "Name Your Zone",
  saveLabel = "Save",
}: ZoneNameDialogProps) {
  const [zoneName, setZoneName] = useState(defaultName);

  const handleSave = () => {
    const trimmedName = zoneName.trim();
    if (trimmedName) {
      onSave(trimmedName);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && zoneName.trim()) {
      handleSave();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div>
          <label htmlFor="zone-name" className="block text-sm font-medium text-foreground mb-2">
            Zone Name
          </label>
          <input
            id="zone-name"
            type="text"
            value={zoneName}
            onChange={(e) => setZoneName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter zone name..."
            className={cn(
              "w-full px-3 py-2 rounded-md",
              "bg-background border border-input",
              "text-foreground placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring",
              "transition-colors"
            )}
            autoFocus
          />
        </div>

        <DialogActions>
          <button
            onClick={onClose}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium",
              "bg-secondary text-secondary-foreground",
              "hover:bg-secondary/80",
              "transition-colors"
            )}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!zoneName.trim()}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium",
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-colors"
            )}
          >
            {saveLabel}
          </button>
        </DialogActions>
      </div>
    </Dialog>
  );
}
