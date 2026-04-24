"use client";
import { useState } from "react";

type Props = {
  className?: string;
  /** Button label in the resting state. */
  label: string;
  /** Warning shown in the inline confirm prompt. */
  message: string;
  /** "Yes, delete" button text. */
  confirmLabel?: string;
  /** aria-label for screen readers when the label is an icon. */
  ariaLabel?: string;
};

/**
 * Two-click destructive submit button. First click reveals an inline
 * confirm row; second click actually submits. Keeps the form submission
 * server-side (no JS needed to actually perform the action).
 */
export function ConfirmSubmit({ className, label, message, confirmLabel = "Confirm", ariaLabel }: Props) {
  const [armed, setArmed] = useState(false);
  if (!armed) {
    return (
      <button
        type="button"
        aria-label={ariaLabel ?? label}
        className={className ?? "btn-danger w-full"}
        onClick={() => setArmed(true)}
      >
        {label}
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <button type="submit" className={className ?? "btn-danger flex-1"} aria-label={`${confirmLabel}: ${message}`}>
        {confirmLabel}
      </button>
      <button type="button" className="btn-ghost" onClick={() => setArmed(false)}>
        Cancel
      </button>
    </div>
  );
}
