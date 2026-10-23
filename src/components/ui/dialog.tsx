import type { ComponentProps } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

export const Dialog = DialogPrimitive.Root;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;
export const DialogClose = DialogPrimitive.Close;
export const DialogTrigger = DialogPrimitive.Trigger;

// Owned shadcn-style wrapper; Radix provides modal isolation, focus and Escape.
export function DialogContent({
  className = "",
  ...props
}: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dialog-overlay" />
      <DialogPrimitive.Content
        className={`dialog-content ${className}`}
        {...props}
      />
    </DialogPrimitive.Portal>
  );
}
