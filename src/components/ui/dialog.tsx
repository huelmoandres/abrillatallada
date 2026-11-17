"use client";

import { createContext, use, useCallback, useEffect, useMemo, useRef } from "react";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

type CloseOptions = { motion?: "exit" | "none" };
type DialogContextValue = { close: (options?: CloseOptions) => void; titleId: string; descriptionId?: string };
const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialogActions() {
  const context = use(DialogContext);
  if (!context) throw new Error("Dialog components require Dialog.Root.");
  return context;
}

function DialogRoot({
  id, className, titleId, descriptionId, open, onClose, children,
}: {
  id: string;
  className?: string;
  titleId: string;
  descriptionId?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closingAnimation = useRef<Animation | null>(null);

  const requestClose = useCallback(async ({ motion = "exit" }: CloseOptions = {}) => {
    const dialog = dialogRef.current;
    if (!dialog?.open) return;
    if (closingAnimation.current) {
      if (motion === "exit") return;
      const previous = closingAnimation.current;
      closingAnimation.current = null;
      previous.cancel();
    }
    if (motion === "none" || matchMedia("(prefers-reduced-motion: reduce)").matches || !dialog.animate) {
      dialog.close();
      return;
    }
    const animation = dialog.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 120, easing: "ease-out", fill: "forwards",
    });
    closingAnimation.current = animation;
    try {
      await animation.finished;
    } catch {
      // Navigation or an immediate close can interrupt the exit animation.
    } finally {
      if (closingAnimation.current === animation) {
        closingAnimation.current = null;
        dialog.close();
        animation.cancel();
      }
    }
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) void requestClose({ motion: "none" });
  }, [open, requestClose]);

  useEffect(() => () => {
    const animation = closingAnimation.current;
    closingAnimation.current = null;
    animation?.cancel();
  }, []);

  const value = useMemo<DialogContextValue>(() => ({
    close: (options) => { void requestClose(options); }, titleId, descriptionId,
  }), [requestClose, titleId, descriptionId]);

  return (
    <DialogContext value={value}>
      <dialog
        ref={dialogRef}
        id={id}
        className={className}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClose={onClose}
        onCancel={(event) => { event.preventDefault(); void requestClose(); }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
            void requestClose();
          }
        }}
      >
        {children}
      </dialog>
    </DialogContext>
  );
}

function DialogTitle(props: HTMLAttributes<HTMLHeadingElement>) {
  const { titleId } = useDialogActions();
  return <h2 {...props} id={titleId} />;
}

function DialogDescription(props: HTMLAttributes<HTMLParagraphElement>) {
  const { descriptionId } = useDialogActions();
  return <p {...props} id={descriptionId} />;
}

function DialogClose({ onClick, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { close } = useDialogActions();
  return <button {...props} type="button" onClick={(event) => { onClick?.(event); if (!event.defaultPrevented) close(); }} />;
}

function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={className ?? "dialog-actions"} />;
}

export const Dialog = { Root: DialogRoot, Title: DialogTitle, Description: DialogDescription, Close: DialogClose, Footer: DialogFooter };
