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
    <div className="bg-blue-500/8 border border-blue-500/20 rounded-2xl p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400/70 mb-0.5">
        Child Dose — by age
      </p>
      <p className="text-xs font-semibold text-blue-300/90 mb-2.5">{drug.name}</p>
      <div className="divide-y divide-blue-500/15">
        {bands.map((band, idx) => (
          <div key={idx} className="flex items-baseline justify-between gap-3 py-1.5">
            <span className="text-sm text-zinc-300">{band.label}</span>
            <span className="text-sm font-bold text-blue-200 text-right whitespace-nowrap">
              {band.dose}
              {band.volume_ml && (
                <span className="text-zinc-400 font-medium"> · {band.volume_ml}</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
