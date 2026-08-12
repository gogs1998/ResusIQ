import { ExternalLink, Pill, X } from 'lucide-react';
import type { Drug } from '../types';
import { ChildDoseBands } from './ChildDoseBands';
import { Sheet } from './Sheet';
import { Callout } from './Callout';

interface DrugCardProps {
  drug: Drug;
  onClose: () => void;
  /** sheet = modal (library). inline = in-runner panel that does not cover End / 999 / the step. */
  variant?: 'sheet' | 'inline';
}

function DrugBody({ drug }: { drug: Drug }) {
  return (
    <div className="space-y-3">
      <p className="text-[15px]">
        <span className="font-bold" style={{ color: 'var(--text-1)' }}>Indication: </span>
        <span style={{ color: 'var(--text-2)' }}>{drug.indication}</span>
      </p>

      <div className="rounded-2xl p-4" style={{ background: 'var(--green-tint)', border: '1px solid color-mix(in srgb, var(--green) 40%, transparent)' }}>
        <p className="cs-eyebrow mb-1" style={{ color: 'var(--green-strong)' }}>Adult Dose</p>
        <p className="cs-numeric text-[22px] font-bold" style={{ color: 'var(--green-strong)' }}>{drug.adult_dose}</p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>{drug.adult_dose_text}</p>
      </div>

      {drug.child_dose_bands && drug.child_dose_bands.length > 0 ? (
        <ChildDoseBands drug={drug} />
      ) : drug.child_dose ? (
        <div className="rounded-2xl p-4" style={{ background: 'var(--roles-tint)', border: '1px solid color-mix(in srgb, var(--roles) 40%, transparent)' }}>
          <p className="cs-eyebrow mb-1" style={{ color: 'var(--roles)' }}>Child Dose</p>
          <p className="cs-numeric text-[17px] font-bold" style={{ color: 'var(--roles)' }}>{drug.child_dose}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>{drug.child_dose_text}</p>
        </div>
      ) : null}

      <div className="rounded-2xl p-3.5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
        <p className="cs-eyebrow mb-1">Route &amp; Site</p>
        <p className="font-bold text-base" style={{ color: 'var(--text-1)' }}>{drug.route}</p>
        {drug.site && <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>Site: {drug.site}</p>}
      </div>

      <div className="rounded-2xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
        <p className="cs-eyebrow mb-2">How to Give</p>
        <p className="whitespace-pre-line text-sm" style={{ color: 'var(--text-2)', lineHeight: 'var(--lh-relaxed)' }}>{drug.how_to_give}</p>
      </div>

      {drug.repeat_interval_min && (
        <div className="rounded-2xl p-3.5" style={{ background: 'var(--decision-tint)', border: '1px solid color-mix(in srgb, var(--decision) 40%, transparent)' }}>
          <p className="cs-eyebrow mb-1" style={{ color: 'var(--decision)' }}>Repeat Interval</p>
          <p className="font-bold text-sm" style={{ color: 'var(--decision)' }}>
            Every {drug.repeat_interval_min} minutes
            {drug.max_doses && ` · max ${drug.max_doses} doses`}
          </p>
        </div>
      )}

      {drug.warnings.length > 0 && <Callout tone="warn" title="Warning" items={drug.warnings} />}

      {drug.contraindications && drug.contraindications.length > 0 && (
        <Callout tone="contra" title="Contraindication" items={drug.contraindications} />
      )}

      <div className="rounded-2xl p-3.5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
        <p className="cs-eyebrow mb-2">References</p>
        <div className="flex flex-wrap gap-1.5">
          {drug.references.map((ref, idx) => (
            <span
              key={idx}
              className="px-2 py-1 rounded-full text-[11px] flex items-center gap-1"
              style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text-3)' }}
            >
              {ref}
              <ExternalLink className="w-2.5 h-2.5" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DrugCard({ drug, onClose, variant = 'sheet' }: DrugCardProps) {
  if (variant === 'inline') {
    return (
      <div
        className="riq-card"
        style={{ marginTop: 12, padding: 16, maxHeight: '40vh', overflowY: 'auto' }}
      >
        <div className="flex items-center justify-between gap-2" style={{ marginBottom: 12 }}>
          <div className="flex items-center gap-2 min-w-0">
            <Pill className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--drug)' }} />
            <h2 className="font-bold truncate" style={{ fontSize: 16 }}>{drug.name}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close drug details"
            className="flex items-center justify-center"
            style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--surface-2)', border: 'none' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <DrugBody drug={drug} />
      </div>
    );
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={drug.name}
      accent="var(--drug)"
      icon={<Pill className="w-6 h-6" />}
      footer={
        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-2xl font-bold text-sm active:opacity-80 transition-opacity"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-1)', minHeight: 'var(--touch-min)' }}
        >
          Close
        </button>
      }
    >
      <DrugBody drug={drug} />
    </Sheet>
  );
}
