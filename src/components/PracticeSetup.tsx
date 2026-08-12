import { useState, type CSSProperties } from 'react';
import {
  ArrowLeft,
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

// Calm-light shared field styles (token-driven)
const fieldLabel: CSSProperties = {
  display: 'block',
  marginBottom: 8,
  fontSize: 'var(--fs-body-sm)',
  fontWeight: 600,
  color: 'var(--text-2)',
};

const fieldInput: CSSProperties = {
  width: '100%',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  padding: 14,
  fontSize: 16,
  color: 'var(--text-1)',
};

const sectionHeading: CSSProperties = {
  fontSize: 'var(--fs-lead)',
  fontWeight: 700,
  color: 'var(--text-1)',
};

const helperText: CSSProperties = {
  fontSize: 'var(--fs-body-sm)',
  color: 'var(--text-2)',
};

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

  const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      className="w-12 h-6 rounded-full transition-colors flex-shrink-0"
      style={{ background: on ? 'var(--brand)' : 'var(--surface-inset)' }}
    >
      <div className="w-5 h-5 rounded-full transition-transform" style={{ background: '#fff', transform: on ? 'translateX(24px)' : 'translateX(2px)' }} />
    </button>
  );

  return (
    <div className="riq-screen safe-area-top">
      {/* Header */}
      <header className="flex items-center gap-2 px-4" style={{ height: 'var(--appbar-h)' }}>
        <button
          onClick={handleBack}
          aria-label="Back"
          className="flex items-center justify-center flex-shrink-0 active:opacity-70 transition-opacity"
          style={{ width: 56, height: 56, background: 'transparent', border: 'none' }}
        >
          <ArrowLeft className="w-7 h-7" style={{ color: 'var(--text-2)' }} />
        </button>
        <div>
          <h1 className="font-bold" style={{ fontSize: 'var(--fs-body)', color: 'var(--text-1)' }}>Practice setup</h1>
          <p
            className="mt-0.5 uppercase"
            style={{ fontSize: 'var(--fs-label)', fontWeight: 700, letterSpacing: 'var(--ls-label)', color: 'var(--brand-strong)' }}
          >
            Step {step} of {totalSteps}
          </p>
        </div>
      </header>

      {/* Progress */}
      <div className="h-2 mx-4 rounded-full overflow-hidden" style={{ background: 'var(--surface-inset)' }}>
        <div
          className="h-full transition-all duration-300 rounded-full"
          style={{ width: `${(step / totalSteps) * 100}%`, background: 'var(--brand)' }}
        />
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto" style={{ padding: 'var(--gutter)' }}>
        {/* Step 1: Practice Details */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="flex items-center gap-2" style={{ color: 'var(--brand)' }}>
              <MapPin className="w-6 h-6" />
              <h2 style={sectionHeading}>Practice details</h2>
            </div>
            <p style={helperText}>
              This address will be displayed when calling 999.
            </p>

            <div>
              <label style={fieldLabel}>Practice name</label>
              <input type="text" value={formData.name} onChange={(e) => updateField('name', e.target.value)} style={fieldInput} placeholder="Your dental practice" />
            </div>

            <div>
              <label style={fieldLabel}>Address</label>
              <input type="text" value={formData.address} onChange={(e) => updateField('address', e.target.value)} style={fieldInput} placeholder="123 High Street" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={fieldLabel}>Postcode</label>
                <input type="text" value={formData.postcode} onChange={(e) => updateField('postcode', e.target.value.toUpperCase())} style={fieldInput} placeholder="AB1 2CD" />
              </div>
              <div>
                <label style={fieldLabel}>Phone</label>
                <input type="tel" value={formData.phone} onChange={(e) => updateField('phone', e.target.value)} style={fieldInput} placeholder="01234 123456" />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Equipment */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="flex items-center gap-2" style={{ color: 'var(--green-700)' }}>
              <Heart className="w-6 h-6" />
              <h2 style={sectionHeading}>Emergency equipment</h2>
            </div>
            <p style={helperText}>
              Select the equipment present at your practice.
            </p>

            {/* AED */}
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: 16 }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Heart className="w-6 h-6" style={{ color: 'var(--red)' }} />
                  <span className="font-semibold" style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-1)' }}>AED (Defibrillator)</span>
                </div>
                <Toggle on={!!formData.aed_present} onClick={() => updateField('aed_present', !formData.aed_present)} />
              </div>
              {formData.aed_present && (
                <input type="text" value={formData.aed_location} onChange={(e) => updateField('aed_location', e.target.value)} style={fieldInput} placeholder="Location (e.g., Reception wall)" />
              )}
            </div>

            {/* Oxygen */}
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: 16 }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Wind className="w-6 h-6" style={{ color: 'var(--brand)' }} />
                  <span className="font-semibold" style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-1)' }}>Oxygen supply</span>
                </div>
                <Toggle on={!!formData.oxygen_present} onClick={() => updateField('oxygen_present', !formData.oxygen_present)} />
              </div>
              {formData.oxygen_present && (
                <input type="text" value={formData.oxygen_location} onChange={(e) => updateField('oxygen_location', e.target.value)} style={fieldInput} placeholder="Location (e.g., Surgery 1)" />
              )}
            </div>

            {/* Other Equipment */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {formData.equipment?.filter(e => !['aed', 'oxygen_cylinder'].includes(e.id)).map(item => (
                <button
                  key={item.id}
                  onClick={() => toggleEquipment(item.id)}
                  className="w-full flex items-center justify-between active:opacity-90 transition-opacity"
                  style={{ minHeight: 'var(--touch-min)', padding: '14px 16px', borderRadius: 'var(--radius-md)', background: item.present ? 'var(--green-50)' : 'var(--surface)', border: `1px solid ${item.present ? 'var(--green-600)' : 'var(--border)'}`, boxShadow: 'var(--shadow-sm)' }}
                >
                  <span style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-1)' }}>{item.name}</span>
                  {item.present && <Check className="w-6 h-6" style={{ color: 'var(--green-700)' }} />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Drugs Kit */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="flex items-center gap-2" style={{ color: 'var(--drug)' }}>
              <Pill className="w-6 h-6" />
              <h2 style={sectionHeading}>Emergency drugs</h2>
            </div>
            <p style={helperText}>
              Based on SDCEP &amp; Scottish Government guidance for dental practices.
            </p>

            <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: 16 }}>
              <label style={fieldLabel}>Drug kit location</label>
              <input type="text" value={formData.drugs_kit_location} onChange={(e) => updateField('drugs_kit_location', e.target.value)} style={fieldInput} placeholder="e.g., Sterilisation room cupboard" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {drugs.map(drug => (
                <button
                  key={drug.id}
                  onClick={() => toggleDrug(drug.id)}
                  className="w-full flex items-center justify-between active:opacity-90 transition-opacity"
                  style={{ minHeight: 'var(--touch-min)', padding: '14px 16px', borderRadius: 'var(--radius-md)', background: drug.present ? 'var(--drug-tint)' : 'var(--surface)', border: `1px solid ${drug.present ? 'var(--drug)' : 'var(--border)'}`, boxShadow: 'var(--shadow-sm)' }}
                >
                  <span style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-1)' }}>{drug.name}</span>
                  {drug.present && <Check className="w-6 h-6" style={{ color: 'var(--drug)' }} />}
                </button>
              ))}
            </div>

            <div style={{ background: 'var(--amber-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--amber-600)', padding: 16 }}>
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: 'var(--amber-700)' }} />
                <div style={{ fontSize: 'var(--fs-body-sm)' }}>
                  <p className="font-semibold" style={{ color: 'var(--amber-700)' }}>Remember to check:</p>
                  <ul className="mt-2 space-y-1" style={{ color: 'var(--text-2)' }}>
                    <li>Expiry dates regularly</li>
                    <li>Drug concentrations (especially adrenaline 1:1000)</li>
                    <li>Stock levels after any use</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Staff Roles */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="flex items-center gap-2" style={{ color: 'var(--roles)' }}>
              <Users className="w-6 h-6" />
              <h2 style={sectionHeading}>Default staff roles</h2>
            </div>
            <p style={helperText}>
              Pre-assign roles for emergency response. These will be displayed when an emergency starts.
            </p>

            {formData.staff_roles?.map((role, index) => (
              <div key={role.id} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: 16 }}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="cs-numeric w-9 h-9 rounded-full flex items-center justify-center font-bold flex-shrink-0" style={{ fontSize: 'var(--fs-body-sm)', background: 'var(--roles-tint)', color: 'var(--roles)' }}>
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
                    style={{ ...fieldInput, flex: 1 }}
                    placeholder="Role name"
                  />
                </div>
                <p style={{ marginLeft: 48, fontSize: 'var(--fs-caption)', color: 'var(--text-3)' }}>
                  Default tasks: {role.default_tasks.join(', ')}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="safe-area-bottom" style={{ padding: 'var(--gutter)' }}>
        <button
          onClick={handleNext}
          className="w-full font-bold flex items-center justify-center gap-2 active:opacity-90 transition-opacity"
          style={{ background: 'var(--brand)', color: '#fff', boxShadow: 'var(--shadow-btn)', borderRadius: 'var(--radius-xl)', minHeight: 'var(--touch-comfort)', fontSize: 'var(--fs-body)' }}
        >
          {step === totalSteps ? (
            <>
              <Save className="w-6 h-6" />
              Save setup
            </>
          ) : (
            'Continue'
          )}
        </button>
      </footer>
    </div>
  );
}