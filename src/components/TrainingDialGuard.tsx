import { useEffect, useState } from 'react';
import { Phone, X } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { isDemoMode } from '../lib/demoMode';

// Training mode dialled a real ambulance.
//
// Every 999 control in the app is a plain `tel:999` anchor, which is exactly
// right in an emergency â€” the dialler is one tap, with nothing in front of it.
// But training mode ran drills through those same controls, so a practice
// rehearsing anaphylaxis could put a real 999 call into the system (Grok F12).
//
// The guard is a single capture-phase listener rather than a change to the
// three call sites, for one reason: the real-emergency path must not gain a
// millisecond of friction or a line of new code. When training mode is off this
// component renders nothing and registers nothing â€” the anchors behave exactly
// as they always have.
//
// It intercepts the click, not the store: an anchor navigation is what dials,
// so preventDefault is the only thing that stops it, and confirming re-issues
// the navigation directly.
export function TrainingDialGuard() {
  const isTrainingMode = useAppStore((s) => s.isTrainingMode);
  // Demo mode gets the same interception: a public visitor exploring the demo
  // must never pocket-dial an ambulance. isDemoMode is a boot constant, so
  // including it here adds nothing to a real (non-demo) emergency path.
  const active = isTrainingMode || isDemoMode;
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    if (!active) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      const link = target?.closest?.('a[href="tel:999"]');
      if (!link) return;
      e.preventDefault();
      e.stopPropagation();
      setAsking(true);
    };
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      // Tearing the guard down clears its question, so leaving and re-entering
      // training mode cannot resurrect a dialog nobody asked for.
      setAsking(false);
    };
  }, [active]);

  if (!active || !asking) return null;

  return (
    <div
      role="alertdialog"
      aria-label="Training mode â€” this dials a real ambulance"
      className="fixed inset-0 flex items-end justify-center"
      style={{ background: 'var(--scrim)', zIndex: 60, padding: 16 }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          padding: 18,
          borderRadius: 'var(--radius-lg)',
          background: 'var(--surface-1)',
          border: '1px solid var(--border-strong)',
          paddingBottom: 'calc(18px + var(--sab, 0px))',
        }}
      >
        <p className="font-extrabold" style={{ margin: 0, fontSize: 18, color: 'var(--text-1)' }}>
          {isDemoMode ? 'This is a demo' : 'Training mode'}
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 'var(--fs-body-sm)', color: 'var(--text-2)', lineHeight: 1.4 }}>
          {isDemoMode ? 'It would dial 999 for real — the live emergency number.' : 'This dials a real ambulance. Nothing about a drill needs a 999 call.'}
        </p>
        <div className="flex items-stretch" style={{ gap: 10, marginTop: 16 }}>
          <button
            autoFocus
            onClick={() => setAsking(false)}
            className="flex items-center justify-center active:scale-[0.98] transition-transform"
            style={{
              flex: 2,
              minHeight: 'var(--touch-comfort)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--brand)',
              color: '#fff',
              border: 'none',
              fontWeight: 800,
              fontSize: 'var(--fs-body-sm)',
            }}
          >
            <X className="w-5 h-5" style={{ marginRight: 6 }} />
            Cancel
          </button>
          <button
            onClick={() => {
              setAsking(false);
              window.location.href = 'tel:999';
            }}
            className="flex items-center justify-center active:scale-[0.98] transition-transform"
            style={{
              flex: 1,
              minHeight: 'var(--touch-comfort)',
              borderRadius: 'var(--radius-md)',
              background: 'transparent',
              color: 'var(--red-strong)',
              border: '1.5px solid var(--red)',
              fontWeight: 700,
              fontSize: 'var(--fs-body-sm)',
            }}
          >
            <Phone className="w-4 h-4" style={{ marginRight: 6 }} />
            Dial anyway
          </button>
        </div>
      </div>
    </div>
  );
}
