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
  Brain
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { protocols } from '../data/protocols';
import { drugs } from '../data/drugs';
import type { Protocol, Drug } from '../types';

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
      <div className="min-h-screen bg-gray-900 text-white flex flex-col">
        <header className="p-4 flex items-center gap-3" style={{ backgroundColor: selectedProtocol.color }}>
          <button
            onClick={() => setSelectedProtocol(null)}
            className="p-2 rounded-lg bg-black/20 hover:bg-black/30"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{selectedProtocol.title}</h1>
            <p className="text-sm opacity-80">{selectedProtocol.steps.length} steps</p>
          </div>
          {IconComponent && <IconComponent className="w-8 h-8 opacity-80" />}
        </header>

        <main className="flex-1 p-4 overflow-y-auto">
          {/* Quick Start */}
          <button
            onClick={() => startEmergency(selectedProtocol.id)}
            className="w-full bg-red-600 hover:bg-red-700 p-4 rounded-xl font-bold mb-4 flex items-center justify-center gap-2"
          >
            START THIS PROTOCOL
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Steps Overview */}
          <div className="bg-gray-800 rounded-xl p-4 mb-4">
            <h2 className="font-bold mb-3">Protocol Steps</h2>
            <div className="space-y-2">
              {selectedProtocol.steps.map((step, idx) => (
                <div key={step.id} className="flex gap-3 p-2 bg-gray-700/50 rounded-lg">
                  <span className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-xs">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {step.show.split('\n')[0].substring(0, 50)}
                      {step.show.split('\n')[0].length > 50 ? '...' : ''}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">{step.type.replace('_', ' ')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* References */}
          <div className="bg-gray-800 rounded-xl p-4">
            <h2 className="font-bold mb-3">References</h2>
            <div className="flex flex-wrap gap-2">
              {selectedProtocol.references.map((ref, idx) => (
                <span key={idx} className="bg-gray-700 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                  {ref}
                  <ExternalLink className="w-3 h-3" />
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3">
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
      <div className="min-h-screen bg-gray-900 text-white flex flex-col">
        <header className="bg-purple-700 p-4 flex items-center gap-3">
          <button
            onClick={() => setSelectedDrug(null)}
            className="p-2 rounded-lg bg-black/20 hover:bg-black/30"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">{selectedDrug.name}</h1>
            <p className="text-sm opacity-80">{selectedDrug.indication}</p>
          </div>
        </header>

        <main className="flex-1 p-4 overflow-y-auto">
          {/* Adult Dose */}
          <div className="bg-green-900/40 border border-green-600 rounded-xl p-4 mb-4">
            <p className="text-sm text-green-400 mb-1">Adult Dose</p>
            <p className="text-2xl font-bold text-green-300">{selectedDrug.adult_dose}</p>
            <p className="text-sm mt-1 text-gray-300">{selectedDrug.adult_dose_text}</p>
          </div>

          {/* Child Dose */}
          {selectedDrug.child_dose && (
            <div className="bg-blue-900/40 border border-blue-600 rounded-xl p-4 mb-4">
              <p className="text-sm text-blue-400 mb-1">Child Dose</p>
              <p className="text-lg font-bold text-blue-300">{selectedDrug.child_dose}</p>
              <p className="text-sm mt-1 text-gray-300">{selectedDrug.child_dose_text}</p>
            </div>
          )}

          {/* Route & Site */}
          <div className="bg-gray-800 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Route</p>
                <p className="font-bold text-lg">{selectedDrug.route}</p>
              </div>
              {selectedDrug.site && (
                <div>
                  <p className="text-sm text-gray-400">Site</p>
                  <p className="font-bold">{selectedDrug.site}</p>
                </div>
              )}
            </div>
          </div>

          {/* How to Give */}
          <div className="bg-gray-800 rounded-xl p-4 mb-4">
            <p className="text-sm text-gray-400 mb-2">How to Give</p>
            <p className="whitespace-pre-line text-sm">{selectedDrug.how_to_give}</p>
          </div>

          {/* Repeat Interval */}
          {selectedDrug.repeat_interval_min && (
            <div className="bg-amber-900/30 border border-amber-600 rounded-xl p-3 mb-4">
              <p className="font-bold">
                ⏱️ Can repeat every {selectedDrug.repeat_interval_min} minutes
                {selectedDrug.max_doses && ` (max ${selectedDrug.max_doses} doses)`}
              </p>
            </div>
          )}

          {/* Warnings */}
          {selectedDrug.warnings.length > 0 && (
            <div className="bg-red-900/30 border border-red-600 rounded-xl p-4 mb-4">
              <p className="text-sm text-red-400 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Warnings
              </p>
              <ul className="space-y-1">
                {selectedDrug.warnings.map((warning, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <span className="text-red-400">•</span>
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Contraindications */}
          {selectedDrug.contraindications && selectedDrug.contraindications.length > 0 && (
            <div className="bg-red-900/50 border border-red-500 rounded-xl p-4 mb-4">
              <p className="text-sm text-red-300 mb-2 font-bold">⛔ Contraindications</p>
              <ul className="space-y-1">
                {selectedDrug.contraindications.map((c, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <span className="text-red-400">•</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* References */}
          <div className="bg-gray-800 rounded-xl p-3">
            <p className="text-sm text-gray-400 mb-2">References</p>
            <div className="flex flex-wrap gap-2">
              {selectedDrug.references.map((ref, idx) => (
                <span key={idx} className="bg-gray-700 px-2 py-1 rounded text-xs">
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
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <header className="bg-gray-800 p-4 flex items-center gap-3">
        <button
          onClick={() => setScreen('home')}
          className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-blue-400" />
          <h1 className="text-xl font-bold">Protocol Library</h1>
        </div>
      </header>

      {/* Search */}
      <div className="p-4 bg-gray-800/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search protocols or drugs..."
            className="w-full bg-gray-700 border border-gray-600 rounded-xl pl-10 pr-4 py-3"
          />
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="px-4 py-2">
        <div className="bg-gray-800 rounded-xl p-1 flex">
          <button
            onClick={() => setViewMode('protocols')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'protocols' ? 'bg-blue-600' : 'hover:bg-gray-700'
            }`}
          >
            Protocols
          </button>
          <button
            onClick={() => setViewMode('drugs')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'drugs' ? 'bg-purple-600' : 'hover:bg-gray-700'
            }`}
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
                  className="w-full bg-gray-800 hover:bg-gray-750 rounded-xl p-4 text-left transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: protocol.color }}
                    >
                      {IconComponent && <IconComponent className="w-6 h-6" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold">{protocol.title}</h3>
                      <p className="text-sm text-gray-400">
                        {protocol.steps.length} steps • {protocol.references.join(', ')}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-500" />
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
                className="w-full bg-gray-800 hover:bg-gray-750 rounded-xl p-4 text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-700 flex items-center justify-center">
                    <span className="text-lg font-bold">{drug.route}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold">{drug.name}</h3>
                    <p className="text-sm text-gray-400">{drug.indication}</p>
                    <p className="text-sm text-green-400">{drug.adult_dose}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Footer note */}
      <div className="bg-gray-800 p-3 text-center text-xs text-gray-500">
        Based on Resuscitation Council UK 2025 & SDCEP guidance
      </div>
    </div>
  );
}
