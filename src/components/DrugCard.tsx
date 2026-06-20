import { X, ExternalLink, AlertTriangle } from 'lucide-react';
import type { Drug } from '../types';

interface DrugCardProps {
  drug: Drug;
  onClose: () => void;
}

export function DrugCard({ drug, onClose }: DrugCardProps) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto sm:mx-4 safe-area-bottom">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-br from-purple-600 to-purple-800 p-4 rounded-t-3xl flex items-center justify-between shadow-lg shadow-purple-600/20">
          <h2 className="text-lg font-bold tracking-tight">{drug.name}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center active:bg-white/25"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Indication */}
          <div className="bg-zinc-800/80 border border-zinc-700/50 rounded-2xl p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Indication</p>
            <p className="font-medium text-sm text-zinc-200">{drug.indication}</p>
          </div>

          {/* Adult Dose */}
          <div className="bg-green-500/8 border border-green-500/20 rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-green-400/70 mb-1">Adult Dose</p>
            <p className="text-2xl font-bold text-green-300">{drug.adult_dose}</p>
            <p className="text-sm mt-1 text-zinc-400">{drug.adult_dose_text}</p>
          </div>

          {/* Child Dose */}
          {drug.child_dose && (
            <div className="bg-blue-500/8 border border-blue-500/20 rounded-2xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400/70 mb-1">Child Dose</p>
              <p className="text-lg font-bold text-blue-300">{drug.child_dose}</p>
              <p className="text-sm mt-1 text-zinc-400">{drug.child_dose_text}</p>
            </div>
          )}

          {/* Route */}
          <div className="bg-zinc-800/80 border border-zinc-700/50 rounded-2xl p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Route</p>
            <p className="font-bold text-base text-zinc-200">{drug.route}</p>
            {drug.site && <p className="text-sm text-zinc-500 mt-0.5">Site: {drug.site}</p>}
          </div>

          {/* How to Give */}
          <div className="bg-zinc-800/80 border border-zinc-700/50 rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">How to Give</p>
            <p className="whitespace-pre-line text-sm text-zinc-300 leading-relaxed">{drug.how_to_give}</p>
          </div>

          {/* Repeat Interval */}
          {drug.repeat_interval_min && (
            <div className="bg-amber-500/8 border border-amber-500/20 rounded-2xl p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400/70 mb-1">Repeat Interval</p>
              <p className="font-bold text-sm text-amber-300">
                Every {drug.repeat_interval_min} minutes
                {drug.max_doses && ` · max ${drug.max_doses} doses`}
              </p>
            </div>
          )}

          {/* Warnings */}
          {drug.warnings.length > 0 && (
            <div className="bg-red-500/8 border border-red-500/20 rounded-2xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-400/70 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" /> Warnings
              </p>
              <ul className="space-y-1.5">
                {drug.warnings.map((warning, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2 text-zinc-300">
                    <span className="text-red-400 mt-1">•</span>
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Contraindications */}
          {drug.contraindications && drug.contraindications.length > 0 && (
            <div className="bg-red-500/12 border border-red-500/30 rounded-2xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-2">⛔ Contraindications</p>
              <ul className="space-y-1.5">
                {drug.contraindications.map((c, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2 text-zinc-300">
                    <span className="text-red-400 mt-1">•</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* References */}
          <div className="bg-zinc-800/80 border border-zinc-700/50 rounded-2xl p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">References</p>
            <div className="flex flex-wrap gap-1.5">
              {drug.references.map((ref, idx) => (
                <span
                  key={idx}
                  className="bg-zinc-700/80 border border-zinc-600/50 px-2 py-1 rounded-lg text-[11px] flex items-center gap-1 text-zinc-400"
                >
                  {ref}
                  <ExternalLink className="w-2.5 h-2.5" />
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-zinc-900/95 backdrop-blur-sm p-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="w-full bg-zinc-800 border border-zinc-700 py-3.5 rounded-2xl font-bold text-sm text-zinc-300 active:bg-zinc-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
