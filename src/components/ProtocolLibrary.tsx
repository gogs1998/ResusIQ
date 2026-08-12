import { useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  BookOpen,
  Search,
  ExternalLink,
  Heart,
  AlertTriangle,
  Wind,
  Droplet,
  CircleOff,
  Zap,
  HeartPulse,
  AlertOctagon,
  Brain,
  Pill
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { protocols } from '../data/protocols';
import { drugs } from '../data/drugs';
import type { Protocol, Drug } from '../types';
import type { CSSProperties } from 'react';
import { ChildDoseBands } from './ChildDoseBands';
import { Callout } from './Callout';
import { CONDITIONS, CONDITION_MARK } from '../lib/conditions';

const iconMap: Record<string, React.ComponentType<{ className?: string; style?: CSSProperties }>> = {
  Heart,
  AlertTriangle,
  Wind,
  Droplet,
  CircleOff,
  Zap,
  HeartPulse,
  AlertOctagon,
  Brain
};

const backBtn: CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: 'var(--radius-md)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  border: 'none',
  flexShrink: 0,
};

const eyebrow: CSSProperties = {
  fontSize: 'var(--fs-label)',
  fontWeight: 700,
  letterSpacing: 'var(--ls-label)',
  textTransform: 'uppercase',
  color: 'var(--brand-strong)',
};

type ViewMode = 'protocols' | 'drugs';

export function ProtocolLibrary() {
  const { setScreen, startEmergency } = useAppStore();
  const [viewMode, setViewMode] = useState<ViewMode>('protocols');
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProtocols = protocols.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDrugs = drugs.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.indication.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Protocol Detail View
  if (selectedProtocol) {
    const IconComponent = iconMap[selectedProtocol.icon];

    return (
      <div className="riq-screen safe-area-top">
        <header className="flex items-center" style={{ gap: 8, padding: '8px 12px' }}>
          <button
            onClick={() => setSelectedProtocol(null)}
            aria-label="Back"
            style={backBtn}
            className="active:opacity-80 transition-opacity"
          >
            <ArrowLeft className="w-7 h-7" style={{ color: 'var(--text-2)' }} />
          </button>
          <div className="flex items-center flex-1 min-w-0" style={{ gap: 12 }}>
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: `color-mix(in srgb, ${CONDITION_MARK[selectedProtocol.id] ?? 'var(--brand)'} 14%, white)` }}
            >
              {IconComponent && <IconComponent className="w-6 h-6" style={{ color: CONDITION_MARK[selectedProtocol.id] ?? 'var(--brand)' }} />}
            </div>
            <div className="min-w-0">
              <h1 className="font-bold truncate" style={{ fontSize: 'var(--fs-body)', color: 'var(--text-1)' }}>{selectedProtocol.title}</h1>
              <p style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-3)' }}>{selectedProtocol.steps.length} steps</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto" style={{ padding: 24 }}>
          {/* Quick Start */}
          <button
            onClick={() => startEmergency(selectedProtocol.id)}
            className="w-full font-bold flex items-center justify-center active:opacity-90 transition-opacity"
            style={{
              gap: 8,
              marginBottom: 24,
              padding: 18,
              borderRadius: 'var(--radius-xl)',
              background: 'var(--red-strong)',
              color: 'var(--text-on-color)',
              fontSize: 'var(--fs-lead)',
              minHeight: 'var(--touch-comfort)',
              boxShadow: 'var(--glow-red)',
              border: 'none',
            }}
          >
            Start this protocol
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Steps Overview */}
          <div style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-md)', borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 16 }}>
            <h2 style={{ ...eyebrow, marginBottom: 16 }}>Protocol steps</h2>
            <div className="space-y-3">
              {selectedProtocol.steps.map((step, idx) => (
                <div key={step.id} className="flex" style={{ gap: 12, padding: 12, borderRadius: 'var(--radius-md)', background: 'var(--surface-2)' }}>
                  <span className="cs-numeric flex items-center justify-center flex-shrink-0" style={{ width: 28, height: 28, borderRadius: 'var(--radius-pill)', fontSize: 'var(--fs-caption)', background: 'var(--brand-tint)', color: 'var(--brand-strong)' }}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium" style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-1)' }}>
                      {step.show.split('\n')[0].substring(0, 50)}
                      {step.show.split('\n')[0].length > 50 ? '...' : ''}
                    </p>
                    <p className="capitalize" style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-3)' }}>{step.type.replace('_', ' ')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* References */}
          <div style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-md)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
            <h2 style={{ ...eyebrow, marginBottom: 16 }}>References</h2>
            <div className="flex flex-wrap" style={{ gap: 8 }}>
              {selectedProtocol.references.map((ref, idx) => (
                <span key={idx} className="flex items-center" style={{ gap: 6, padding: '6px 14px', borderRadius: 'var(--radius-pill)', fontSize: 'var(--fs-caption)', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                  {ref}
                  <ExternalLink className="w-3.5 h-3.5" />
                </span>
              ))}
            </div>
            <p style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-3)', marginTop: 16 }}>
              Protocols based on Resuscitation Council UK 2025 Guidelines and SDCEP guidance.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Drug Detail View
  if (selectedDrug) {
    return (
      <div className="riq-screen safe-area-top">
        <header className="flex items-center" style={{ gap: 8, padding: '8px 12px' }}>
          <button
            onClick={() => setSelectedDrug(null)}
            aria-label="Back"
            style={backBtn}
            className="active:opacity-80 transition-opacity"
          >
            <ArrowLeft className="w-7 h-7" style={{ color: 'var(--text-2)' }} />
          </button>
          <div className="flex items-center flex-1 min-w-0" style={{ gap: 12 }}>
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: 'var(--drug-tint)' }}
            >
              <Pill className="w-6 h-6" style={{ color: 'var(--drug)' }} />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold truncate" style={{ fontSize: 'var(--fs-body)', color: 'var(--text-1)' }}>{selectedDrug.name}</h1>
              <p className="truncate" style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-3)' }}>{selectedDrug.indication}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto space-y-4" style={{ padding: 24 }}>
          {/* Adult Dose */}
          <div style={{ borderRadius: 'var(--radius-lg)', padding: 20, background: 'var(--green-tint)', border: '1px solid color-mix(in srgb, var(--green) 40%, transparent)' }}>
            <p style={{ ...eyebrow, color: 'var(--green-strong)', marginBottom: 6 }}>Adult dose</p>
            <p className="cs-numeric font-bold" style={{ fontSize: 'var(--fs-lead)', color: 'var(--green-strong)' }}>{selectedDrug.adult_dose}</p>
            <p style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-2)', marginTop: 4 }}>{selectedDrug.adult_dose_text}</p>
          </div>

          {/* Child Dose */}
          {selectedDrug.child_dose_bands && selectedDrug.child_dose_bands.length > 0 ? (
            <ChildDoseBands drug={selectedDrug} />
          ) : selectedDrug.child_dose ? (
            <div style={{ borderRadius: 'var(--radius-lg)', padding: 20, background: 'var(--roles-tint)', border: '1px solid color-mix(in srgb, var(--roles) 40%, transparent)' }}>
              <p style={{ ...eyebrow, color: 'var(--roles)', marginBottom: 6 }}>Child dose</p>
              <p className="cs-numeric font-bold" style={{ fontSize: 'var(--fs-body)', color: 'var(--roles)' }}>{selectedDrug.child_dose}</p>
              <p style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-2)', marginTop: 4 }}>{selectedDrug.child_dose_text}</p>
            </div>
          ) : null}

          {/* Route & Site */}
          <div style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-md)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
            <div className="grid grid-cols-2" style={{ gap: 16 }}>
              <div>
                <p style={{ ...eyebrow, marginBottom: 6 }}>Route</p>
                <p className="font-bold" style={{ fontSize: 'var(--fs-body)', color: 'var(--text-1)' }}>{selectedDrug.route}</p>
              </div>
              {selectedDrug.site && (
                <div>
                  <p style={{ ...eyebrow, marginBottom: 6 }}>Site</p>
                  <p className="font-bold" style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-1)' }}>{selectedDrug.site}</p>
                </div>
              )}
            </div>
          </div>

          {/* How to Give */}
          <div style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-md)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
            <p style={{ ...eyebrow, marginBottom: 8 }}>How to give</p>
            <p className="whitespace-pre-line" style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-2)' }}>{selectedDrug.how_to_give}</p>
          </div>

          {/* Repeat Interval */}
          {selectedDrug.repeat_interval_min && (
            <div style={{ borderRadius: 'var(--radius-md)', padding: 16, background: 'var(--decision-tint)', border: '1px solid color-mix(in srgb, var(--decision) 40%, transparent)' }}>
              <p className="font-bold" style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--amber-700)' }}>
                Can repeat every {selectedDrug.repeat_interval_min} minutes
                {selectedDrug.max_doses && ` (max ${selectedDrug.max_doses} doses)`}
              </p>
            </div>
          )}

          {/* Warnings */}
          {selectedDrug.warnings.length > 0 && <Callout tone="warn" title="Warning" items={selectedDrug.warnings} />}

          {/* Contraindications */}
          {selectedDrug.contraindications && selectedDrug.contraindications.length > 0 && (
            <Callout tone="contra" title="Contraindication" items={selectedDrug.contraindications} />
          )}

          {/* References */}
          <div style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-md)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
            <p style={{ ...eyebrow, marginBottom: 8 }}>References</p>
            <div className="flex flex-wrap" style={{ gap: 8 }}>
              {selectedDrug.references.map((ref, idx) => (
                <span key={idx} style={{ padding: '6px 12px', borderRadius: 'var(--radius-pill)', fontSize: 'var(--fs-caption)', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                  {ref}
                </span>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Main Library View
  return (
    <div className="riq-screen safe-area-top">
      <header className="flex items-center" style={{ gap: 8, padding: '8px 12px' }}>
        <button
          onClick={() => setScreen('home')}
          aria-label="Back"
          style={backBtn}
          className="active:opacity-80 transition-opacity"
        >
          <ArrowLeft className="w-7 h-7" style={{ color: 'var(--text-2)' }} />
        </button>
        <div className="flex items-center" style={{ gap: 10 }}>
          <BookOpen className="w-6 h-6" style={{ color: 'var(--brand)' }} />
          <h1 className="font-bold" style={{ fontSize: 'var(--fs-body)', color: 'var(--text-1)' }}>Protocol library</h1>
        </div>
      </header>

      {/* Search */}
      <div style={{ padding: '8px 24px 12px' }}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-3)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search protocols or drugs..."
            className="w-full"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 14px 14px 44px',
              fontSize: 16,
              color: 'var(--text-1)',
            }}
          />
        </div>
      </div>

      {/* View Mode Toggle */}
      <div style={{ padding: '0 24px 8px' }}>
        <div className="flex" style={{ gap: 4, padding: 4, borderRadius: 'var(--radius-lg)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <button
            onClick={() => setViewMode('protocols')}
            className="flex-1 font-semibold transition-colors"
            style={{
              padding: '12px 0',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--fs-label)',
              border: 'none',
              ...(viewMode === 'protocols'
                ? { background: 'var(--surface)', color: 'var(--brand-strong)', boxShadow: 'var(--shadow-sm)' }
                : { background: 'transparent', color: 'var(--text-3)' }),
            }}
          >
            Protocols
          </button>
          <button
            onClick={() => setViewMode('drugs')}
            className="flex-1 font-semibold transition-colors"
            style={{
              padding: '12px 0',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--fs-label)',
              border: 'none',
              ...(viewMode === 'drugs'
                ? { background: 'var(--surface)', color: 'var(--brand-strong)', boxShadow: 'var(--shadow-sm)' }
                : { background: 'transparent', color: 'var(--text-3)' }),
            }}
          >
            Drugs
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto" style={{ padding: '12px 24px 24px' }}>
        {viewMode === 'protocols' ? (
          <div className="space-y-3">
            {filteredProtocols.map((protocol) => {
              const IconComponent = iconMap[protocol.icon];
              const mark = CONDITION_MARK[protocol.id] ?? 'var(--brand)';
              const cue = CONDITIONS.find((c) => c.id === protocol.id)?.cue;

              return (
                <button
                  key={protocol.id}
                  onClick={() => setSelectedProtocol(protocol)}
                  className="w-full text-left flex items-center active:scale-[0.98] transition-transform"
                  style={{
                    gap: 14,
                    padding: '14px 16px',
                    minHeight: 72,
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-sm)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <span aria-hidden style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: mark }} />
                  <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{ width: 44, height: 44, borderRadius: 10, background: `color-mix(in srgb, ${mark} 14%, white)` }}
                  >
                    {IconComponent && <IconComponent className="w-5 h-5" style={{ color: mark }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold" style={{ fontSize: 17, lineHeight: 1.15, color: 'var(--text-1)' }}>{protocol.title}</h3>
                    <p className="truncate" style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                      {cue ?? `${protocol.steps.length} steps`}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--text-3)' }} />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDrugs.map((drug) => (
              <button
                key={drug.id}
                onClick={() => setSelectedDrug(drug)}
                className="w-full text-left flex items-center active:scale-[0.98] transition-transform"
                style={{
                  gap: 16,
                  padding: 18,
                  minHeight: 'var(--touch-min)',
                  borderRadius: 'var(--radius-xl)',
                  background: 'var(--surface)',
                  boxShadow: 'var(--shadow-md)',
                  border: 'none',
                }}
              >
                <div
                  className="cs-numeric flex items-center justify-center flex-shrink-0"
                  style={{ width: 56, height: 56, borderRadius: 'var(--radius-lg)', background: 'var(--drug-tint)', color: 'var(--drug)' }}
                >
                  <span className="font-bold" style={{ fontSize: 'var(--fs-label)' }}>{drug.route}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold" style={{ fontSize: 'var(--fs-lead)', lineHeight: 1.15, color: 'var(--text-1)' }}>{drug.name}</h3>
                  <p className="truncate" style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-3)', marginTop: 4 }}>{drug.indication}</p>
                  <p className="cs-numeric" style={{ fontSize: 'var(--fs-caption)', color: 'var(--green-strong)', marginTop: 2 }}>{drug.adult_dose}</p>
                </div>
                <ChevronRight className="w-6 h-6 flex-shrink-0" style={{ color: 'var(--text-3)' }} />
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Footer note */}
      <div className="text-center safe-area-bottom" style={{ padding: 16, fontSize: 'var(--fs-caption)', color: 'var(--text-3)' }}>
        Based on Resuscitation Council UK 2025 &amp; SDCEP guidance
      </div>
    </div>
  );
}
