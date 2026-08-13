// Ending an emergency is the one irreversible gesture in the runner: the event
// log closes and, in CPR, the guidance stops. Both screens put that gesture in a
// small X in the top corner, next to nothing else the thumb reaches for.
//
// Clinical ruling R5 (2026-08-13) prescribes this confirmation verbatim — title,
// body, both button labels, and which one is primary. Treat a change here as a
// clinical change.
//
// It is a BAR, not a modal overlay. In CPR the compression counter and the
// pacing ring must stay visible and tappable while it shows (the metronome keeps
// running audibly underneath), so the confirm swaps the header row and leaves
// the rest of the screen alone. Nothing here touches the metronome.

const TITLE = 'End the emergency?';

export const END_CONFIRM_TITLE = TITLE;
export const END_CONFIRM_BODY_CPR = 'CPR guidance will stop and the event log will close.';
export const END_CONFIRM_BODY_RUNNER = 'Guidance will stop and the event log will close.';

/** Marks the bar's subtree, so a parent can tell "clicked inside" from "clicked away". */
export const END_CONFIRM_ATTR = 'data-end-confirm';

interface EndConfirmBarProps {
  body: string;
  onKeepGoing: () => void;
  onEnd: () => void;
}

export function EndConfirmBar({ body, onKeepGoing, onEnd }: EndConfirmBarProps) {
  return (
    <div
      {...{ [END_CONFIRM_ATTR]: '' }}
      role="alertdialog"
      aria-label={TITLE}
      aria-describedby="end-confirm-body"
      style={{
        padding: '12px 14px 14px',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--surface-2)',
        border: '1px solid var(--border-strong)',
      }}
    >
      <p className="font-extrabold" style={{ fontSize: 17, lineHeight: 1.2, color: 'var(--text-1)', margin: 0 }}>
        {TITLE}
      </p>
      <p id="end-confirm-body" style={{ fontSize: 13.5, lineHeight: 1.4, color: 'var(--text-2)', margin: '5px 0 0' }}>
        {body}
      </p>
      <div className="flex items-stretch" style={{ gap: 10, marginTop: 12 }}>
        {/* Keep going is the default and the big one: the overwhelmingly likely
            intent behind a stray tap on X is that they did not mean to end. */}
        <button
          autoFocus
          onClick={onKeepGoing}
          className="flex items-center justify-center active:scale-[0.98] transition-transform"
          style={{
            flex: 2,
            minHeight: 'var(--touch-hero)',
            borderRadius: 'var(--radius-xl)',
            background: 'var(--brand)',
            color: '#fff',
            border: 'none',
            boxShadow: 'var(--shadow-btn)',
            fontWeight: 800,
            fontSize: 'var(--fs-subtitle)',
          }}
        >
          Keep going
        </button>
        <button
          onClick={onEnd}
          className="flex items-center justify-center active:scale-[0.98] transition-transform"
          style={{
            flex: 1,
            minHeight: 'var(--touch-comfort)',
            borderRadius: 'var(--radius-lg)',
            background: 'transparent',
            color: 'var(--text-3)',
            border: '1px solid var(--border-strong)',
            fontWeight: 700,
            fontSize: 'var(--fs-body-sm)',
          }}
        >
          End emergency
        </button>
      </div>
    </div>
  );
}
