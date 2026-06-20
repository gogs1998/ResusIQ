import { useState } from 'react';
import { 
  ChevronLeft, 
  Save, 
  MapPin, 
  Heart,
  Wind,
  Pill,
  Users,
  Check,
  AlertTriangle
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import type { PracticeSetup, StaffRole, EquipmentItem } from '../types';

const defaultEquipment: EquipmentItem[] = [
  { id: 'aed', name: 'AED (Defibrillator)', present: false },
  { id: 'oxygen_cylinder', name: 'Oxygen Cylinder', present: false },
  { id: 'oxygen_mask', name: 'Non-rebreather Mask', present: false },
  { id: 'bvm', name: 'Bag-Valve-Mask', present: false },
  { id: 'suction', name: 'Suction Device', present: false },
  { id: 'spacer', name: 'Spacer Device', present: false },
  { id: 'bp_monitor', name: 'BP Monitor', present: false },
  { id: 'pulse_oximeter', name: 'Pulse Oximeter', present: false },
  { id: 'glucometer', name: 'Blood Glucose Monitor', present: false },
];

const defaultDrugs: EquipmentItem[] = [
  { id: 'adrenaline', name: 'Adrenaline 1:1000', present: false },
  { id: 'aspirin', name: 'Aspirin 300mg', present: false },
  { id: 'glucagon', name: 'Glucagon Injection', present: false },
  { id: 'glucose', name: 'Oral Glucose (GlucoGel/tablets)', present: false },
  { id: 'gtn', name: 'GTN Spray', present: false },
  { id: 'midazolam', name: 'Midazolam Buccal', present: false },
  { id: 'salbutamol', name: 'Salbutamol Inhaler', present: false },
];

const defaultStaffRoles: StaffRole[] = [
  { id: '1', name: 'Team Leader', default_tasks: ['Coordinate response', 'Assess patient'] },
  { id: '2', name: 'Nurse 1', default_tasks: ['Call 999', 'Document'] },
  { id: '3', name: 'Nurse 2', default_tasks: ['Get AED & oxygen', 'Assist with drugs'] },
  { id: '4', name: 'Receptionist', default_tasks: ['Direct ambulance', 'Clear area'] },
];

export function PracticeSetupWizard() {
  const { practiceSetup, setPracticeSetup, setScreen } = useAppStore();
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<PracticeSetup>>({
    id: practiceSetup?.id || crypto.randomUUID(),
    name: practiceSetup?.name || '',
    address: practiceSetup?.address || '',
    postcode: practiceSetup?.postcode || '',
    phone: practiceSetup?.phone || '',
    aed_present: practiceSetup?.aed_present || false,
    aed_location: practiceSetup?.aed_location || '',
    oxygen_present: practiceSetup?.oxygen_present || false,
    oxygen_location: practiceSetup?.oxygen_location || '',
    drugs_kit_location: practiceSetup?.drugs_kit_location || '',
    equipment: practiceSetup?.equipment || [...defaultEquipment],
    staff_roles: practiceSetup?.staff_roles || [...defaultStaffRoles],
  });

  const [drugs, setDrugs] = useState<EquipmentItem[]>(
    practiceSetup?.equipment?.filter(e => defaultDrugs.some(d => d.id === e.id)) || [...defaultDrugs]
  );

  const totalSteps = 4;

  const updateField = (field: keyof PracticeSetup, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleEquipment = (id: string) => {
    setFormData(prev => ({
      ...prev,
      equipment: prev.equipment?.map(e => 
        e.id === id ? { ...e, present: !e.present } : e
      )
    }));
  };

  const toggleDrug = (id: string) => {
    setDrugs(prev => prev.map(d => 
      d.id === id ? { ...d, present: !d.present } : d
    ));
  };

  const handleSave = () => {
    const fullSetup: PracticeSetup = {
      id: formData.id!,
      name: formData.name!,
      address: formData.address!,
      postcode: formData.postcode!,
      phone: formData.phone!,
      aed_present: formData.aed_present!,
      aed_location: formData.aed_location,
      oxygen_present: formData.oxygen_present!,
      oxygen_location: formData.oxygen_location,
      drugs_kit_location: formData.drugs_kit_location,
      equipment: [...(formData.equipment || []), ...drugs],
      staff_roles: formData.staff_roles!,
    };
    setPracticeSetup(fullSetup);
    setScreen('home');
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(prev => prev - 1);
    } else {
      setScreen('home');
    }
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(prev => prev + 1);
    } else {
      handleSave();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 p-4 flex items-center gap-3">
        <button
          onClick={handleBack}
          className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Practice Setup</h1>
          <p className="text-sm text-gray-400">Step {step} of {totalSteps}</p>
        </div>
      </header>

      {/* Progress */}
      <div className="h-2 bg-gray-700">
        <div 
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>

      {/* Content */}
      <main className="flex-1 p-4 overflow-y-auto">
        {/* Step 1: Practice Details */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-blue-400 mb-4">
              <MapPin className="w-5 h-5" />
              <h2 className="text-lg font-bold">Practice Details</h2>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              This address will be displayed when calling 999.
            </p>

            <div>
              <label className="text-sm text-gray-400">Practice Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 mt-1"
                placeholder="Your Dental Practice"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 mt-1"
                placeholder="123 High Street"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-400">Postcode</label>
                <input
                  type="text"
                  value={formData.postcode}
                  onChange={(e) => updateField('postcode', e.target.value.toUpperCase())}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 mt-1"
                  placeholder="AB1 2CD"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 mt-1"
                  placeholder="01onal 123456"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Equipment */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-400 mb-4">
              <Heart className="w-5 h-5" />
              <h2 className="text-lg font-bold">Emergency Equipment</h2>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Select the equipment present at your practice.
            </p>

            {/* AED */}
            <div className="bg-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-yellow-500" />
                  <span className="font-medium">AED (Defibrillator)</span>
                </div>
                <button
                  onClick={() => updateField('aed_present', !formData.aed_present)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    formData.aed_present ? 'bg-green-600' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    formData.aed_present ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
              {formData.aed_present && (
                <input
                  type="text"
                  value={formData.aed_location}
                  onChange={(e) => updateField('aed_location', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-sm"
                  placeholder="Location (e.g., Reception wall)"
                />
              )}
            </div>

            {/* Oxygen */}
            <div className="bg-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Wind className="w-5 h-5 text-blue-500" />
                  <span className="font-medium">Oxygen Supply</span>
                </div>
                <button
                  onClick={() => updateField('oxygen_present', !formData.oxygen_present)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    formData.oxygen_present ? 'bg-green-600' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    formData.oxygen_present ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
              {formData.oxygen_present && (
                <input
                  type="text"
                  value={formData.oxygen_location}
                  onChange={(e) => updateField('oxygen_location', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-sm"
                  placeholder="Location (e.g., Surgery 1)"
                />
              )}
            </div>

            {/* Other Equipment */}
            <div className="space-y-2">
              {formData.equipment?.filter(e => !['aed', 'oxygen_cylinder'].includes(e.id)).map(item => (
                <button
                  key={item.id}
                  onClick={() => toggleEquipment(item.id)}
                  className={`w-full p-3 rounded-lg flex items-center justify-between ${
                    item.present ? 'bg-green-900/30 border border-green-700' : 'bg-gray-800 border border-gray-700'
                  }`}
                >
                  <span>{item.name}</span>
                  {item.present && <Check className="w-5 h-5 text-green-500" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Drugs Kit */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-purple-400 mb-4">
              <Pill className="w-5 h-5" />
              <h2 className="text-lg font-bold">Emergency Drugs</h2>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Based on SDCEP & Scottish Government guidance for dental practices.
            </p>

            <div className="bg-gray-800 rounded-xl p-4 mb-4">
              <label className="text-sm text-gray-400">Drug Kit Location</label>
              <input
                type="text"
                value={formData.drugs_kit_location}
                onChange={(e) => updateField('drugs_kit_location', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 mt-1"
                placeholder="e.g., Sterilisation room cupboard"
              />
            </div>

            <div className="space-y-2">
              {drugs.map(drug => (
                <button
                  key={drug.id}
                  onClick={() => toggleDrug(drug.id)}
                  className={`w-full p-3 rounded-lg flex items-center justify-between ${
                    drug.present ? 'bg-purple-900/30 border border-purple-700' : 'bg-gray-800 border border-gray-700'
                  }`}
                >
                  <span>{drug.name}</span>
                  {drug.present && <Check className="w-5 h-5 text-purple-500" />}
                </button>
              ))}
            </div>

            <div className="bg-amber-900/30 border border-amber-700 rounded-xl p-4 mt-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-400">Remember to check:</p>
                  <ul className="mt-1 text-gray-300 space-y-1">
                    <li>• Expiry dates regularly</li>
                    <li>• Drug concentrations (especially adrenaline 1:1000)</li>
                    <li>• Stock levels after any use</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Staff Roles */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-cyan-400 mb-4">
              <Users className="w-5 h-5" />
              <h2 className="text-lg font-bold">Default Staff Roles</h2>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Pre-assign roles for emergency response. These will be displayed when an emergency starts.
            </p>

            {formData.staff_roles?.map((role, index) => (
              <div key={role.id} className="bg-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-cyan-600 w-8 h-8 rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={role.name}
                    onChange={(e) => {
                      const newRoles = [...(formData.staff_roles || [])];
                      newRoles[index] = { ...newRoles[index], name: e.target.value };
                      updateField('staff_roles', newRoles);
                    }}
                    className="flex-1 bg-gray-700 border border-gray-600 rounded-lg p-2"
                    placeholder="Role name"
                  />
                </div>
                <p className="text-sm text-gray-400 ml-10">
                  Default tasks: {role.default_tasks.join(', ')}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 p-4">
        <button
          onClick={handleNext}
          className="w-full bg-blue-600 hover:bg-blue-700 p-4 rounded-xl font-bold flex items-center justify-center gap-2"
        >
          {step === totalSteps ? (
            <>
              <Save className="w-5 h-5" />
              Save Setup
            </>
          ) : (
            'Continue'
          )}
        </button>
      </footer>
    </div>
  );
}
