import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Phone, Syringe, ClipboardList } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { getDrugById } from '../../data/drugs';
import { hhmm } from '../../lib/emergencyTimers';
import { CallScriptContent } from '../CallScript';

// The deck — a slide-up sheet inside the runner. Dissolves the "999 script / log
// unreachable mid-emergency" gap WITHOUT adding navigation that can hide the
// runner (CLAUDE.md: ProtocolRunner must stay reachable — the deck lives inside
// it). Collapsed it is just a handle + three tabs; a tab opens the sheet.

const PANEL_ID = 'console-deck-panel';

type DeckTab = 'script' | 'drugs' | 'log';

const TABS: { id: DeckTab; label: string; Icon: LucideIcon }[] = [
  { id: 'script', label: '999 script', Icon: Phone },
  { id: 'drugs', label: 'Drugs', Icon: Syringe },
  { id: 'log', label: 'Log', Icon: ClipboardList },
];

const tabBtnBase: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  background: 'var(--surface-1)',
  border: '1px solid var(--border)',
  color: 'var(--text-3)',
  borderRadius: 9,
  padding: '8px 4px',
  fontSize: 11.5,
  fontWeight: 700,
  cursor: 'pointer',
};

const rowStyle: CSSProperties = {
  display: 'flex',
  gap: 10,
  fontSize: 12.5,
  padding: '6px 0',
  borderBottom: '1px solid var(--border-faint)',
  color: 'var(--text-2)',
};

const rowTime: CSSProperties = {
  color: 'var(--text-3)',
  fontWeight: 700,
  flex: 'none',
};

const sayLabel: CSSProperties = {
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--text-3)',
  fontWeight: 800,
  margin: '6px 0',
};

export function Deck() {
  const activeEvent = useAppStore((s) => s.activeEvent);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<DeckTab>('script');

  const events = activeEvent?.events ?? [];
  const drugsGiven = events.filter((e) => e.type === 'drug_given');

  const openTab = (id: DeckTab) => {
    setTab(id);
    setOpen(true);
  };

  // Escape closes the sheet (matches the platform expectation for a transient
  // overlay; the runner underneath stays put).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div style={{ background: 'var(--surface-inset)', borderTop: '1px solid var(--border)' }}>
      <div className="flex justify-center" style={{ padding: '7px 0 3px' }}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={PANEL_ID}
          aria-label={open ? 'Close deck' : 'Open deck'}
          style={{
            border: 'none',
            background: 'transparent',
            padding: '4px 20px',
            cursor: 'pointer',
            borderRadius: 6,
          }}
        >
          <span style={{ display: 'block', width: 36, height: 4, borderRadius: 2, background: 'var(--border-strong)' }} />
        </button>
      </div>

      <div className="flex" style={{ gap: 6, padding: '2px 14px 12px' }}>
        {TABS.map((t) => {
          const active = open && tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => openTab(t.id)}
              aria-pressed={active}
              aria-controls={PANEL_ID}
              style={{
                ...tabBtnBase,
                ...(active
                  ? { color: 'var(--text-1)', borderColor: 'var(--border-strong)', background: 'var(--surface-3)' }
                  : null),
              }}
            >
              <t.Icon className="w-4 h-4" aria-hidden style={{ flexShrink: 0 }} />
              {t.label}
            </button>
          );
        })}
      </div>

      {open && (
        <div id={PANEL_ID} style={{ padding: '0 16px 14px', maxHeight: '40vh', overflowY: 'auto' }}>
          {tab === 'script' && (
            <div className="riq-script-doc">
              <CallScriptContent />
            </div>
          )}

          {tab === 'drugs' && (
            <>
              <div style={sayLabel}>Given so far · tap for full drug card</div>
              {drugsGiven.length === 0 ? (
                <p style={{ fontSize: 12.5, color: 'var(--text-3)', padding: '6px 0' }}>No drugs given yet</p>
              ) : (
                drugsGiven.map((e) => {
                  const drug = e.drug_id ? getDrugById(e.drug_id) : undefined;
                  return (
                    <div key={e.id} style={rowStyle}>
                      <span className="riq-data" style={rowTime}>{hhmm(e.timestamp)}</span>
                      <span style={{ minWidth: 0 }}>
                        <span className="block font-semibold" style={{ color: 'var(--text-1)' }}>
                          {drug?.name ?? e.label}
                        </span>
                        {drug && (
                          <span className="block" style={{ color: 'var(--text-2)', marginTop: 1 }}>
                            {drug.adult_dose_text}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })
              )}
            </>
          )}

          {tab === 'log' && (
            <>
              <div style={sayLabel}>Event log — feeds the 999 script &amp; SBAR</div>
              {events.length === 0 ? (
                <p style={{ fontSize: 12.5, color: 'var(--text-3)', padding: '6px 0' }}>No events logged yet</p>
              ) : (
                events.map((e) => (
                  <div key={e.id} style={rowStyle}>
                    <span className="riq-data" style={rowTime}>{hhmm(e.timestamp)}</span>
                    <span>{e.label}</span>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
