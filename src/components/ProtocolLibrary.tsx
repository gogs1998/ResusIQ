import { useState } from 'react';
import { 
  ChevronLeft, 
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
import { ChildDoseBands } from './ChildDoseBands';
import { Callout } from './Callout';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
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
      <div className="min-h-screen flex flex-col safe-area-top" style={{ background: 'var(--bg)', color: 'var(--text-1)' }}>
        <header className="flex items-center gap-3 px-4" style={{ height: 'var(--appbar-h)' }}>
          <button
            onClick={() => setSelectedProtocol(null)}
            aria-label="Back"
            className="w-11 h-11 rounded-xl flex items-center justify-center active:opacity-80 transition-opacity"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
          >
            <ChevronLeft className="w-5 h-5" style={{ color: 'var(--text-2)' }} />
          </button>
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `color-mix(in srgb, ${selectedProtocol.color} 18%, transparent)` }}>
              {IconComponent && <IconComponent className="w-5 h-5" style={{ color: selectedProtocol.color }} />}
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold truncate" style={{ color: 'var(--text-1)' }}>{selectedProtocol.title}</h1>
              <p className="cs-eyebrow">{selectedProtocol.steps.length} steps</p>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 overflow-y-auto">
          {/* Quick Start */}
          <button
            onClick={() => startEmergency(selectedProtocol.id)}
            className="w-full p-4 rounded-xl font-bold mb-4 flex items-center justify-center gap-2 active:opacity-90 transition-opacity"
            style={{ background: 'var(--red-strong)', color: 'var(--text-on-color)', minHeight: 'var(--touch-comfort)', boxShadow: 'var(--glow-red)' }}
          >
            START THIS PROTOCOL
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Steps Overview */}
          <div className="cs-card p-4 mb-4">
            <h2 className="cs-eyebrow mb-3">Protocol Steps</h2>
            <div className="space-y-2">
              {selectedProtocol.steps.map((step, idx) => (
                <div key={step.id} className="flex gap-3 p-2 rounded-lg" style={{ background: 'var(--surface-2)' }}>
                  <span className="cs-numeric w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                      {step.show.split('\n')[0].substring(0, 50)}
                      {step.show.split('\n')[0].length > 50 ? '...' : ''}
                    </p>
                    <p className="text-xs capitalize" style={{ color: 'var(--text-3)' }}>{step.type.replace('_', ' ')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* References */}
          <div className="cs-card p-4">
            <h2 className="cs-eyebrow mb-3">References</h2>
            <div className="flex flex-wrap gap-2">
              {selectedProtocol.references.map((ref, idx) => (
                <span key={idx} className="px-3 py-1 rounded-full text-sm flex items-center gap-1" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-3)' }}>
                  {ref}
                  <ExternalLink className="w-3 h-3" />
                </span>
              ))}
            </div>
            <p className="text-xs mt-3" style={{ color: 'var(--text-3)' }}>
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
      <div className="min-h-screen flex flex-col safe-area-top" style={{ background: 'var(--bg)', color: 'var(--text-1)' }}>
        <header className="flex items-center gap-3 px-4" style={{ height: 'var(--appbar-h)' }}>
          <button
            onClick={() => setSelectedDrug(null)}
            aria-label="Back"
            className="w-11 h-11 rounded-xl flex items-center justify-center active:opacity-80 transition-opacity"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
          >
            <ChevronLeft className="w-5 h-5" style={{ color: 'var(--text-2)' }} />
          </button>
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--drug-tint)' }}>
              <Pill className="w-5 h-5" style={{ color: 'var(--drug)' }} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold truncate" style={{ color: 'var(--text-1)' }}>{selectedDrug.name}</h1>
              <p className="cs-eyebrow truncate">{selectedDrug.indication}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 overflow-y-auto space-y-4">
          {/* Adult Dose */}
          <div className="rounded-xl p-4" style={{ background: 'var(--green-tint)', border: '1px solid color-mix(in srgb, var(--green) 40%, transparent)' }}>
            <p className="cs-eyebrow mb-1" style={{ color: 'var(--green)' }}>Adult Dose</p>
            <p className="cs-numeric text-[22px] font-bold" style={{ color: 'var(--green)' }}>{selectedDrug.adult_dose}</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>{selectedDrug.adult_dose_text}</p>
          </div>

          {/* Child Dose */}
          {selectedDrug.child_dose_bands && selectedDrug.child_dose_bands.length > 0 ? (
            <ChildDoseBands drug={selectedDrug} />
          ) : selectedDrug.child_dose ? (
            <div className="rounded-xl p-4" style={{ background: 'var(--roles-tint)', border: '1px solid color-mix(in srgb, var(--roles) 40%, transparent)' }}>
              <p className="cs-eyebrow mb-1" style={{ color: 'var(--roles)' }}>Child Dose</p>
              <p className="cs-numeric text-[17px] font-bold" style={{ color: 'var(--roles)' }}>{selectedDrug.child_dose}</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>{selectedDrug.child_dose_text}</p>
            </div>
          ) : null}

          {/* Route & Site */}
          <div className="cs-card p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="cs-eyebrow mb-1">Route</p>
                <p className="font-bold text-lg" style={{ color: 'var(--text-1)' }}>{selectedDrug.route}</p>
              </div>
              {selectedDrug.site && (
                <div>
                  <p className="cs-eyebrow mb-1">Site</p>
                  <p className="font-bold" style={{ color: 'var(--text-1)' }}>{selectedDrug.site}</p>
                </div>
              )}
            </div>
          </div>

          {/* How to Give */}
          <div className="cs-card p-4">
            <p className="cs-eyebrow mb-2">How to Give</p>
            <p className="whitespace-pre-line text-sm" style={{ color: 'var(--text-2)' }}>{selectedDrug.how_to_give}</p>
          </div>

          {/* Repeat Interval */}
          {selectedDrug.repeat_interval_min && (
            <div className="rounded-xl p-3" style={{ background: 'var(--decision-tint)', border: '1px solid color-mix(in srgb, var(--decision) 40%, transparent)' }}>
              <p className="font-bold text-sm" style={{ color: 'var(--decision)' }}>
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
          <div className="cs-card p-3">
            <p className="cs-eyebrow mb-2">References</p>
            <div className="flex flex-wrap gap-2">
              {selectedDrug.references.map((ref, idx) => (
                <span key={idx} className="px-2 py-1 rounded-full text-xs" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-3)' }}>
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
    <div className="min-h-screen flex flex-col safe-area-top" style={{ background: 'var(--bg)', color: 'var(--text-1)' }}>
      <header className="flex items-center gap-3 px-4" style={{ height: 'var(--appbar-h)' }}>
        <button
          onClick={() => setScreen('home')}
          aria-label="Back"
          className="w-11 h-11 rounded-xl flex items-center justify-center active:opacity-80 transition-opacity"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
        >
          <ChevronLeft className="w-5 h-5" style={{ color: 'var(--text-2)' }} />
        </button>
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6" style={{ color: 'var(--brand)' }} />
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Protocol Library</h1>
        </div>
      </header>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-3)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search protocols or drugs..."
            className="cs-input pl-10"
          />
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="px-4 pb-2">
        <div className="rounded-xl p-1 flex" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <button
            onClick={() => setViewMode('protocols')}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
            style={viewMode === 'protocols' ? { background: 'var(--brand-tint)', color: 'var(--brand)' } : { color: 'var(--text-3)' }}
          >
            Protocols
          </button>
          <button
            onClick={() => setViewMode('drugs')}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
            style={viewMode === 'drugs' ? { background: 'var(--drug-tint)', color: 'var(--drug)' } : { color: 'var(--text-3)' }}
          >
            Drugs
          </button>
        </div>
      </div>

      <main className="flex-1 p-4 overflow-y-auto">
        {viewMode === 'protocols' ? (
          <div className="space-y-3">
            {filteredProtocols.map((protocol) => {
              const IconComponent = iconMap[protocol.icon];

              return (
                <button
                  key={protocol.id}
                  onClick={() => setSelectedProtocol(protocol)}
                  className="w-full cs-card p-4 text-left active:opacity-90 transition-opacity"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `color-mix(in srgb, ${protocol.color} 18%, transparent)` }}
                    >
                      {IconComponent && <IconComponent className="w-6 h-6" style={{ color: protocol.color }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold" style={{ color: 'var(--text-1)' }}>{protocol.title}</h3>
                      <p className="text-sm truncate" style={{ color: 'var(--text-3)' }}>
                        {protocol.steps.length} steps • {protocol.references.join(', ')}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--text-3)' }} />
                  </div>
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
                className="w-full cs-card p-4 text-left active:opacity-90 transition-opacity"
              >
                <div className="flex items-center gap-3">
                  <div className="cs-numeric w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--drug-tint)', color: 'var(--drug)' }}>
                    <span className="text-base font-bold">{drug.route}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold" style={{ color: 'var(--text-1)' }}>{drug.name}</h3>
                    <p className="text-sm" style={{ color: 'var(--text-3)' }}>{drug.indication}</p>
                    <p className="cs-numeric text-sm" style={{ color: 'var(--green)' }}>{drug.adult_dose}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--text-3)' }} />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Footer note */}
      <div className="p-3 text-center text-xs safe-area-bottom" style={{ color: 'var(--text-3)' }}>
        Based on Resuscitation Council UK 2025 &amp; SDCEP guidance
      </div>
    </div>
  );
}
