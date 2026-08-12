import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Accent colour (CSS var) for the header icon. */
  accent?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Shared Clear Signal dialog. A real modal: focus moves in and is trapped,
 * Escape closes, focus returns to the trigger, body scroll locks, backdrop
 * dismisses. Bottom-sheet on phone, centred on wider screens. One component
 * for every dialog in the app (Drug Card, AED shock, AI settings) so the
 * a11y behaviour can't drift.
 */
export function Sheet({ open, onClose, title, accent = 'var(--text-1)', icon, children, footer }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusables = () =>
      panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );
    (focusables()?.[0] ?? panelRef.current)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const f = focusables();
      if (!f || f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'var(--scrim)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl sm:mx-4"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', boxShadow: 'var(--elev-modal)' }}
      >
        <div
          className="sticky top-0 flex items-center justify-between gap-3 px-5 py-4"
          style={{ background: 'var(--surface-1)', borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && <span style={{ color: accent }} className="flex-shrink-0">{icon}</span>}
            <h2 id={titleId} className="text-lg font-bold truncate" style={{ color: 'var(--text-1)' }}>{title}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 active:opacity-80"
            style={{ background: 'var(--surface-2)', minWidth: 44, minHeight: 44 }}
          >
            <X className="w-4 h-4" style={{ color: 'var(--text-2)' }} />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && (
          <div
            className="sticky bottom-0 p-4 safe-area-bottom"
            style={{ background: 'var(--surface-1)', borderTop: '1px solid var(--border)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
