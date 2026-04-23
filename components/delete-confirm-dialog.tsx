"use client";

import { AlertTriangle } from "lucide-react";
import { Dialog, DialogActions } from "./ui/dialog";
import { cn } from "@/lib/utils";

interface DeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  zoneName?: string;
  isDeleting?: boolean;
}

export function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  zoneName,
  isDeleting = false,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title='Delete Zone'>
      <div className='space-y-4'>
        <div className='flex items-start gap-3 p-3 bg-destructive/10 rounded-md border border-destructive/20'>
          <AlertTriangle className='w-5 h-5 text-destructive shrink-0 mt-0.5' />
          <div className='text-sm'>
            <p className='text-foreground font-medium'>Are you sure?</p>
            <p className='text-muted-foreground mt-1'>
              {zoneName
                ? `This will permanently delete "${zoneName}".`
                : "This will permanently delete this zone."}
            </p>
            <p className='text-muted-foreground mt-1'>
              This action cannot be undone.
            </p>
          </div>
        </div>

        <DialogActions>
          <button
            onClick={() => {
              if (!isDeleting) onClose();
            }}
            disabled={isDeleting}
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
            onClick={onConfirm}
            disabled={isDeleting}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium",
              "bg-destructive text-destructive-foreground",
              "hover:bg-destructive/90",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-colors",
            )}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </DialogActions>
      </div>
    </Dialog>
  );
}
