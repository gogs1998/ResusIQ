import type { Drug } from '../types';

/**
 * Renders a drug's structured paediatric dose bands as a by-age table.
 * Single source of truth shared by DrugCard and ProtocolRunner so the bands
 * are never duplicated (and never drift) between the two.
 *
 * The drug name — which carries the concentration (e.g. "1:1000") — is shown
 * in the same frame as the volumes: a volume like "0.15 ml" is unsafe to read
 * without the concentration visible alongside it.
 */
export function ChildDoseBands({ drug }: { drug: Drug }) {
  const bands = drug.child_dose_bands;
  if (!bands || bands.length === 0) return null;

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: 'var(--roles-tint)', border: '1px solid color-mix(in srgb, var(--roles) 35%, transparent)' }}
    >
      <p className="cs-eyebrow mb-0.5" style={{ color: 'var(--roles)' }}>Child Dose — by age</p>
      {/* Concentration anchor — keep prominent + verbatim */}
      <p className="text-[13px] font-semibold mb-2.5" style={{ color: 'var(--text-1)' }}>{drug.name}</p>
      <div>
        {bands.map((band, idx) => (
          <div
            key={idx}
            className="flex items-baseline justify-between gap-3 py-1.5"
            style={idx > 0 ? { borderTop: '1px solid color-mix(in srgb, var(--roles) 15%, transparent)' } : undefined}
          >
            <span className="text-sm" style={{ color: 'var(--text-2)' }}>{band.label}</span>
            <span className="cs-numeric text-sm font-bold text-right whitespace-nowrap" style={{ color: 'var(--text-1)' }}>
              {band.dose}
              {band.volume_ml && (
                <span className="font-medium" style={{ color: 'var(--text-3)' }}> · {band.volume_ml}</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
