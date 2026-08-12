import { useState } from 'react';
import { ChevronUp, Copy, Check, Pill, ClipboardList, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { useAppStore } from '../../store/appStore';
import { getDrugById } from '../../data/drugs';
import { buildScriptLines } from '../../lib/callScript';
import { DrugCard } from '../DrugCard';

type Tab = '999' | 'drugs' | 'log';

/**
 * In-runner tray. Lives inside ProtocolRunner so the live step is never
 * navigated away from. Expanding it shrinks the step body, not the chrome.
 */
export function Deck() {
  const { practiceSetup, activeProtocol, activeEvent } = useAppStore();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('999');
  const [copied, setCopied] = useState(false);
  const [drugId, setDrugId] = useState<string | null>(null);

  const lines = buildScriptLines({
    protocolId: activeProtocol?.id,
    protocolTitle: activeProtocol?.title,
    practiceName: practiceSetup?.name,
    address: practiceSetup?.address,
    postcode: practiceSetup?.postcode,
    phone: practiceSetup?.phone,
    events: activeEvent?.events,
  });
  const fullScript = lines.map((l) => `${l.label}: ${l.text}`).join('\n');

  const given = (activeEvent?.events ?? []).filter((e) => e.type === 'drug_given');
  const log = activeEvent?.events ?? [];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullScript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const openDrug = drugId ? getDrugById(drugId) : null;

  return (
    <div style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-1)' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-center gap-2"
        style={{ minHeight: 40, background: 'transparent', border: 'none', color: 'var(--text-2)', fontWeight: 700, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}
        aria-expanded={open}
        aria-label={open ? 'Hide 999 script, drugs and log' : 'Show 999 script, drugs and log'}
      >
        <ChevronUp className="w-4 h-4" style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 120ms' }} />
        999 script · Drugs · Log
      </button>

      {open && (
        <div style={{ padding: '0 16px 12px', maxHeight: '36vh', overflowY: 'auto' }}>
          <div className="flex" style={{ gap: 4, marginBottom: 10 }}>
            {([
              { id: '999' as const, icon: Phone, label: '999' },
              { id: 'drugs' as const, icon: Pill, label: 'Drugs' },
              { id: 'log' as const, icon: ClipboardList, label: 'Log' },
            ]).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="flex-1 flex items-center justify-center gap-1.5"
                style={{
                  minHeight: 40,
                  borderRadius: 8,
                  border: 'none',
                  fontWeight: 700,
                  fontSize: 12,
                  background: tab === id ? 'var(--surface-3)' : 'transparent',
                  color: tab === id ? 'var(--text-1)' : 'var(--text-3)',
                }}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>

          {tab === '999' && (
            <div>
              <div className="flex justify-end" style={{ marginBottom: 8 }}>
                <button onClick={copy} className="flex items-center gap-1" style={{ background: 'transparent', border: 'none', color: copied ? 'var(--green-bright)' : 'var(--text-2)', fontSize: 12, fontWeight: 700 }}>
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              {lines.map((l) => (
                <div key={l.label} style={{ marginBottom: 8 }}>
                  <div className="riq-kicker" style={{ color: 'var(--text-3)' }}>{l.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginTop: 2 }}>{l.text}</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'drugs' && (
            <div>
              {given.length === 0 ? (
                <p style={{ fontSize: 14, color: 'var(--text-3)' }}>No drugs confirmed yet.</p>
              ) : given.map((e) => {
                const drug = e.drug_id ? getDrugById(e.drug_id) : undefined;
                return (
                  <button
                    key={e.id}
                    onClick={() => e.drug_id && setDrugId(e.drug_id)}
                    className="w-full text-left"
                    style={{ padding: '10px 0', border: 'none', background: 'transparent', borderBottom: '1px solid var(--border)' }}
                  >
                    <div className="riq-data" style={{ fontSize: 11, color: 'var(--text-3)' }}>{format(new Date(e.timestamp), 'HH:mm:ss')}</div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{drug?.name ?? e.label}</div>
                    {drug && <div className="riq-data" style={{ fontSize: 13, color: 'var(--green-bright)' }}>{drug.adult_dose}</div>}
                  </button>
                );
              })}
              {openDrug && (
                <DrugCard drug={openDrug} onClose={() => setDrugId(null)} variant="inline" />
              )}
            </div>
          )}

          {tab === 'log' && (
            <div>
              {log.length === 0 ? (
                <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Nothing logged yet.</p>
              ) : log.map((e) => (
                <div key={e.id} className="flex gap-2" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span className="riq-data" style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>
                    {format(new Date(e.timestamp), 'HH:mm:ss')}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--text-1)' }}>{e.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
