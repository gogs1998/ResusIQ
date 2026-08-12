import { ExternalLink, Pill } from 'lucide-react';
import type { Drug } from '../types';
import { ChildDoseBands } from './ChildDoseBands';
import { Sheet } from './Sheet';
import { Callout } from './Callout';

interface DrugCardProps {
  drug: Drug;
  onClose: () => void;
}

export function DrugCard({ drug, onClose }: DrugCardProps) {
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
      <div className="space-y-3">
        {/* Indication */}
        <p className="text-[15px]">
          <span className="font-bold" style={{ color: 'var(--text-1)' }}>Indication: </span>
          <span style={{ color: 'var(--text-2)' }}>{drug.indication}</span>
        </p>

        {/* Adult Dose — doses in mono so 1:1000 / micrograms stay unambiguous */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--green-tint)', border: '1px solid color-mix(in srgb, var(--green) 40%, transparent)' }}>
          <p className="cs-eyebrow mb-1" style={{ color: 'var(--green)' }}>Adult Dose</p>
          <p className="cs-numeric text-[22px] font-bold" style={{ color: 'var(--green)' }}>{drug.adult_dose}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>{drug.adult_dose_text}</p>
        </div>

        {/* Child Dose — structured bands when available, else free text (blue) */}
        {drug.child_dose_bands && drug.child_dose_bands.length > 0 ? (
          <ChildDoseBands drug={drug} />
        ) : drug.child_dose ? (
          <div className="rounded-2xl p-4" style={{ background: 'var(--roles-tint)', border: '1px solid color-mix(in srgb, var(--roles) 40%, transparent)' }}>
            <p className="cs-eyebrow mb-1" style={{ color: 'var(--roles)' }}>Child Dose</p>
            <p className="cs-numeric text-[17px] font-bold" style={{ color: 'var(--roles)' }}>{drug.child_dose}</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>{drug.child_dose_text}</p>
          </div>
        ) : null}

        {/* Route & Site */}
        <div className="rounded-2xl p-3.5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <p className="cs-eyebrow mb-1">Route &amp; Site</p>
          <p className="font-bold text-base" style={{ color: 'var(--text-1)' }}>{drug.route}</p>
          {drug.site && <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>Site: {drug.site}</p>}
        </div>

        {/* How to Give */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <p className="cs-eyebrow mb-2">How to Give</p>
          <p className="whitespace-pre-line text-sm" style={{ color: 'var(--text-2)', lineHeight: 'var(--lh-relaxed)' }}>{drug.how_to_give}</p>
        </div>

        {/* Repeat Interval — render exactly what the data provides (no invented max) */}
        {drug.repeat_interval_min && (
          <div className="rounded-2xl p-3.5" style={{ background: 'var(--decision-tint)', border: '1px solid color-mix(in srgb, var(--decision) 40%, transparent)' }}>
            <p className="cs-eyebrow mb-1" style={{ color: 'var(--decision)' }}>Repeat Interval</p>
            <p className="font-bold text-sm" style={{ color: 'var(--decision)' }}>
              Every {drug.repeat_interval_min} minutes
              {drug.max_doses && ` · max ${drug.max_doses} doses`}
            </p>
          </div>
        )}

        {/* Warnings */}
        {drug.warnings.length > 0 && <Callout tone="warn" title="Warning" items={drug.warnings} />}

        {/* Contraindications — escalated red, stronger than warnings */}
        {drug.contraindications && drug.contraindications.length > 0 && (
          <Callout tone="contra" title="Contraindication" items={drug.contraindications} />
        )}

        {/* References */}
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
    </Sheet>
  );
}
