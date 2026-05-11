import { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  destructive = false,
}: ConfirmModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
      if (event.key === "Enter") onConfirm();
    };
    window.addEventListener("keydown", handleKey);
    confirmRef.current?.focus();
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-md card glass-strong p-6 animate-scale-in">
        <button
          type="button"
          onClick={onCancel}
          className="absolute right-3 top-3 icon-btn"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-start gap-4">
          <div
            className={[
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
              destructive
                ? "bg-red-500/15 text-red-400"
                : "bg-brand-500/15 text-brand-400",
            ].join(" ")}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2
              id="confirm-title"
              className="text-lg font-semibold text-white"
            >
              {title}
            </h2>
            <p className="mt-1 text-sm text-gray-400">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={[
              "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all duration-200 active:scale-[0.98]",
              destructive
                ? "bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 shadow-[0_0_24px_-6px_rgba(244,63,94,0.55)]"
                : "bg-gradient-to-r from-brand-600 to-purple-500 hover:from-brand-500 hover:to-purple-400 shadow-glow",
            ].join(" ")}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
