"use client";
import { useFormStatus } from "react-dom";

type Props = {
  className?: string;
  children: React.ReactNode;
  pendingLabel?: string;
};

/**
 * Button that disables + swaps label while its enclosing <form> is submitting.
 * Uses the native form-status hook — no client state, no prop drilling.
 */
export function SubmitButton({ className = "btn-primary", children, pendingLabel }: Props) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className + (pending ? " opacity-70 cursor-wait" : "")} aria-busy={pending}>
      {pending ? (pendingLabel ?? "Saving…") : children}
    </button>
  );
}
